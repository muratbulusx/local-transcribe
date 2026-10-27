"use strict";

const $ = (s) => document.querySelector(s);
const UI_LANGS = { tr: "Türkçe", en: "English", es: "Español", pt: "Português (Brasil)", fr: "Français", de: "Deutsch", ru: "Русский", ar: "العربية", zh: "简体中文", ja: "日本語" };
const SPEECH_LANGS = ["tr", "en", "es", "pt", "fr", "de", "ru", "ar", "zh", "ja", "it", "nl", "pl", "uk", "fa", "hi", "ko", "id", "auto"];
const RTL = ["ar", "fa"];
const PROVIDERS = { gemini: "Gemini", claude: "Claude", openai: "OpenAI" };
const KEY_URLS = { gemini: "https://aistudio.google.com/apikey", claude: "https://console.anthropic.com/settings/keys", openai: "https://platform.openai.com/api-keys" };
const BUILTIN_PRESETS = ["not", "duzelt", "ozet"];
const FORMATS = { pdf: true, docx: true, txt: false, srt: false };  // değer: yazı tipi ayarları var mı
const FONT_CSS = { inter: "Inter, sans-serif", notosans: "'Noto Sans', sans-serif", notoserif: "'Noto Serif', serif", lora: "Lora, serif" };

let app = null;                       // /api/state
let lang = "en", dict = {}, fallback = {};
const store = {
  file: null, fileName: "", segments: [], edited: "",
  models: {}, keyStatus: {},
  provider: localStorage.getItem("provider") || "gemini",
  presetId: "not",
  progress: null,                     // {label:[key,vars], meta:[key,vars]|string}
  editStatus: ["ed.notYet"],
};

/* ---------- Dil ---------- */
function t(key, vars = {}) {
  const s = dict[key] ?? fallback[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}
async function loadDict(code) {
  const res = await fetch(`/static/i18n/${code}.json`);
  return res.ok ? res.json() : {};
}
function pickLang() {
  if (app.settings.ui_lang && UI_LANGS[app.settings.ui_lang]) return app.settings.ui_lang;
  for (const l of navigator.languages || [navigator.language]) {
    const code = l.slice(0, 2).toLowerCase();
    if (UI_LANGS[code]) return code;
  }
  return "en";
}
async function setLang(code) {
  if (!Object.keys(fallback).length) fallback = await loadDict("en");
  dict = code === "en" ? fallback : await loadDict(code);
  lang = code;
  document.documentElement.lang = code;
  document.documentElement.dir = RTL.includes(code) ? "rtl" : "ltr";
  applyI18n();
}
function applyI18n() {
  document.title = t("app.title");
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-ph]")) el.placeholder = t(el.dataset.i18nPh);
  for (const el of document.querySelectorAll("[data-i18n-aria]")) el.setAttribute("aria-label", t(el.dataset.i18nAria));
  const names = new Intl.DisplayNames([lang], { type: "language" });
  for (const sel of document.querySelectorAll(".lang-options")) {
    sel.replaceChildren(...SPEECH_LANGS.map((c) => new Option(c === "auto" ? t("st.auto") : cap(names.of(c)), c)));
    if (app) sel.value = app.settings.language;
  }
  if (!app) return;
  if (store.file) showFile(store.file);
  renderModelStatus();
  renderPresets(true);
  renderProgress();
  renderEditStatus();
  if (!store.segments.length) renderSegments();
  if (!store.edited) $("#edit-out").innerHTML = `<p class="muted">${esc(t("ed.outputEmpty"))}</p>`;
  if (!$("#view-duzenle").hidden) refreshProviders();
  if (!$("#view-ayarlar").hidden) renderSettings();
  if ($("#export-dialog").open) renderExport();
}
const cap = (s) => (s ? s[0].toLocaleUpperCase(lang) + s.slice(1) : s);
const num = (n) => new Intl.NumberFormat(lang).format(n);

/* ---------- yardımcılar ---------- */
function toast(text) {
  const el = $("#toast");
  el.textContent = text; el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), 3500);
}
function errText(code, msg) {
  const key = `err.${code}`;
  return key in fallback ? t(key, { msg: msg || "" }) : msg || t("err.generic");
}
function clock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}
const jobId = () => Math.random().toString(36).slice(2);
function save() {
  try {
    localStorage.setItem("last", JSON.stringify({ fileName: store.fileName, segments: store.segments, edited: store.edited }));
  } catch { /* kota dolarsa son metni saklamadan devam */ }
}
function saveSoon() {
  clearTimeout(saveSoon.t);
  saveSoon.t = setTimeout(save, 500);
}
async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))).detail;
    throw new Error(errText(detail || "generic"));
  }
  return res.json();
}
async function* ndjson(res) {
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (line) yield JSON.parse(line);
    }
  }
}
function copyText(text, btn) {
  if (!text.trim()) return toast(t("err.nothingToCopy"));
  navigator.clipboard.writeText(text).then(() => {
    const span = btn.querySelector("span");
    span.textContent = t("btn.copied");
    setTimeout(() => (span.textContent = t("btn.copy")), 1600);
  });
}
function seg(el, items, current, onPick) {
  el.replaceChildren(...items.map(([id, label, disabled]) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label;
    b.setAttribute("aria-pressed", String(id === current));
    b.disabled = !!disabled;
    b.onclick = () => onPick(id);
    return b;
  }));
}
function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

/* ---------- Daktilo: gelen metni ChatGPT gibi akıtarak yazar ---------- */
class Typer {
  constructor(onFrame) { this.queue = []; this.onFrame = onFrame; this.running = false; }
  push(target, text) { this.queue.push({ target, text, i: 0 }); if (!this.running) this.tick(); }
  pending() { return this.queue.reduce((n, q) => n + q.text.length - q.i, 0); }
  flush() { for (const q of this.queue) q.target(q.text.slice(q.i)); this.queue = []; }
  tick() {
    this.running = true;
    const head = this.queue[0];
    if (!head) { this.running = false; this.onFrame?.(true); return; }
    // Geride kaldıkça hızlanır, böylece metin hiçbir zaman çok gecikmez
    const step = Math.max(1, Math.ceil(this.pending() / 90));
    head.target(head.text.slice(head.i, head.i + step));
    head.i += step;
    if (head.i >= head.text.length) this.queue.shift();
    this.onFrame?.(false);
    requestAnimationFrame(() => this.tick());
  }
}

/* ---------- Gezinme ve tema ---------- */
function show(view) {
  if (!["ceviri", "duzenle", "ayarlar"].includes(view)) view = "ceviri";
  for (const v of document.querySelectorAll(".view")) v.hidden = v.id !== `view-${view}`;
  for (const a of document.querySelectorAll(".nav-links a")) {
    if (a.dataset.view === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  }
  if (view === "duzenle") refreshProviders();
  if (view === "ayarlar") renderSettings();
}
window.addEventListener("hashchange", () => show(location.hash.slice(1)));
function applyTheme(th) {
  if (th === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = th;
}

/* ---------- Durum ---------- */
function renderModelStatus() {
  const m = app.settings.model, st = app.models[m].state;
  $("#model-chip").textContent = m;
  $("#model-dot").className = "dot " + (st === "ready" ? "ok" : st === "downloading" ? "busy" : "");
  $("#model-status").textContent = `${m} · ${t(st === "ready" ? "status.ready" : st === "downloading" ? "status.downloading" : "status.missing")}`;
}
async function setSetting(changes) {
  app.settings = await api("/api/settings", { method: "POST", body: JSON.stringify(changes) });
  if ("model" in changes) { app = await api("/api/state"); pollDownloads(); }
  renderModelStatus();
}
function pollDownloads() {
  clearTimeout(pollDownloads.t);
  if (!Object.values(app.models).some((x) => x.state === "downloading")) return;
  pollDownloads.t = setTimeout(async () => {
    app = await api("/api/state");
    renderModelStatus();
    if (!$("#view-ayarlar").hidden) renderModels();
    pollDownloads();
  }, 2500);
}

/* ---------- Çeviri ---------- */
const transcriptEl = $("#transcript");
let transcribeJob = null;
let caret = null;
// Kutu en alttayken yeni metinle birlikte kayar; kullanıcı yukarı kaydırdıysa yerinde bırakır
const atBottom = (el) => el.scrollHeight - el.scrollTop - el.clientHeight < 60;
let rawFollow = true;
transcriptEl.addEventListener("scroll", () => (rawFollow = atBottom(transcriptEl)));
const rawTyper = new Typer((idle) => {
  if (idle && caret && !transcribeJob) caret.remove();
  if (rawFollow) transcriptEl.scrollTop = transcriptEl.scrollHeight;
});

function showFile(f, duration) {
  $("#file-name").removeAttribute("data-i18n");
  $("#file-info").removeAttribute("data-i18n");
  $("#file-name").textContent = f.name;
  const mb = num(Math.round((f.size / 1024 / 1024) * 10) / 10);
  if (duration != null) store.fileDuration = duration;
  $("#file-info").textContent = store.fileDuration != null ? `${clock(store.fileDuration)} · ${mb} MB` : t("tr.fileReady", { size: mb });
}
function pickFile(f) {
  if (!f) return;
  store.file = f; store.fileDuration = null;
  showFile(f);
  $("#run-btn").disabled = false;
  const url = URL.createObjectURL(f), media = document.createElement(f.type.startsWith("video") ? "video" : "audio");
  media.preload = "metadata"; media.src = url;
  media.onloadedmetadata = () => {
    if (isFinite(media.duration)) showFile(f, media.duration);
    URL.revokeObjectURL(url);
  };
}
$("#pick-btn").onclick = () => $("#file-input").click();
$("#file-input").onchange = (e) => pickFile(e.target.files[0]);
const drop = $("#drop");
drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); pickFile(e.dataTransfer.files[0]); });

$("#lang-select").onchange = (e) => setSetting({ language: e.target.value });
$("#clean-chip").onclick = (e) => {
  const on = e.currentTarget.getAttribute("aria-checked") !== "true";
  e.currentTarget.setAttribute("aria-checked", String(on));
  setSetting({ clean: on });
};

function addLine(s) {
  $("#transcript-empty")?.remove();
  const line = document.createElement("div");
  line.className = "line" + (s.unsure ? " unsure" : "");
  if (s.unsure) line.title = t("tr.unsure");
  const time = document.createElement("time"); time.textContent = clock(s.start);
  const p = document.createElement("p");
  p.dir = "auto";
  const text = document.createTextNode("");
  p.append(text);
  line.append(time, p);
  transcriptEl.append(line);
  return (chunk) => {
    text.data += chunk;
    if (!caret) { caret = document.createElement("span"); caret.className = "caret"; caret.textContent = "▍"; }
    p.append(caret);
  };
}
function renderSegments() {
  transcriptEl.replaceChildren();
  if (!store.segments.length) {
    transcriptEl.innerHTML = `<p class="empty muted" id="transcript-empty">${esc(t("tr.empty"))}</p>`;
    return;
  }
  for (const s of store.segments) addLine(s)(s.text);
  caret?.remove();
}
function setProgress(label, pct, meta) {
  store.progress = { label, meta: meta === undefined ? store.progress?.meta : meta };
  if (pct != null) { $("#bar-fill").style.width = pct + "%"; $("#bar").setAttribute("aria-valuenow", String(Math.round(pct))); }
  renderProgress();
}
function renderProgress() {
  const p = store.progress;
  if (!p) return;
  $("#progress").hidden = false;
  $("#progress-label").textContent = t(...p.label);
  $("#progress-meta").textContent = Array.isArray(p.meta) ? p.meta.map((m) => (Array.isArray(m) ? t(...m) : m)).join(" · ") : "";
}

$("#stop-btn").onclick = () => {
  if (transcribeJob) api(`/api/cancel/${transcribeJob}`, { method: "POST" });
  $("#stop-btn").disabled = true;
};
$("#run-btn").onclick = async () => {
  if (transcribeJob || !store.file) return;
  if (store.segments.length && !confirm(t("tr.confirmReplace"))) return;
  store.segments = []; store.fileName = store.file.name.replace(/\.[^.]+$/, "");
  renderSegments(); save();
  rawFollow = true;
  transcribeJob = jobId();
  const btn = $("#run-btn"), stop = $("#stop-btn");
  btn.disabled = true; $("#pick-btn").disabled = true;
  stop.hidden = false; stop.disabled = false;
  setProgress(["progress.uploading"], 0, null);
  const started = Date.now();
  let total = 0;
  try {
    const fd = new FormData();
    fd.append("file", store.file); fd.append("job_id", transcribeJob);
    const res = await fetch("/api/transcribe", { method: "POST", body: fd });
    if (!res.ok) throw new Error(t("err.upload"));
    for await (const ev of ndjson(res)) {
      if (ev.type === "status") setProgress([`progress.${ev.code}`, { model: ev.model, size: ev.size }]);
      else if (ev.type === "info") { total = ev.duration; setProgress(["progress.transcribing"], 0, [`${num(0)}%`, ["progress.audio", { dur: clock(total) }]]); }
      else if (ev.type === "segment") { store.segments.push(ev); rawTyper.push(addLine(ev), ev.text); save(); }
      else if (ev.type === "progress") {
        const elapsed = (Date.now() - started) / 1000;
        const left = ev.pct > 2 ? (elapsed * (100 - ev.pct)) / ev.pct : null;
        const meta = [`${num(Math.round(ev.pct))}%`];
        if (left != null) meta.push(["progress.left", { min: num(Math.max(1, Math.ceil(left / 60))) }]);
        setProgress(["progress.transcribing"], ev.pct, meta);
      }
      else if (ev.type === "done") setProgress(["progress.done"], 100, [["progress.took", { dur: clock(total), took: clock((Date.now() - started) / 1000) }]]);
      else if (ev.type === "cancelled") setProgress(["progress.cancelled"], null, null);
      else if (ev.type === "error") { setProgress(["progress.error"], null, null); toast(errText(ev.code, ev.msg)); }
    }
  } catch (e) {
    toast(e.message || t("err.connection"));
  } finally {
    transcribeJob = null;
    btn.disabled = false; $("#pick-btn").disabled = false; stop.hidden = true;
    if (!rawTyper.running) caret?.remove();
    save();
  }
};
const rawText = () => store.segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
$("#copy-raw").onclick = (e) => copyText(rawText(), e.currentTarget);
$("#clear-raw").onclick = () => {
  if (transcribeJob || !store.segments.length || !confirm(t("tr.confirmClear"))) return;
  store.segments = []; store.fileName = "";
  store.progress = null; $("#progress").hidden = true;
  renderSegments(); save();
};
$("#export-raw").onclick = () => openExport("raw");
$("#to-edit").onclick = () => {
  if (!store.segments.length) return toast(t("err.noTranscript"));
  $("#src-text").value = rawText();
  $("#src-note").dataset.i18n = "ed.fromTranscript";
  $("#src-note").textContent = t("ed.fromTranscript");
  location.hash = "#duzenle";
};

/* ---------- AI Düzenle ---------- */
function presets() {
  const hidden = app.settings.hidden_presets || [];
  const builtin = BUILTIN_PRESETS.filter((id) => !hidden.includes(id))
    .map((id) => ({ id, label: t(`preset.${id}.label`), text: t(`preset.${id}.text`), builtin: true }));
  return [...builtin, ...app.settings.presets];
}
function renderPresets(langChanged) {
  const list = presets();
  const cur = list.find((p) => p.id === store.presetId);
  // Dil değişince, kullanıcı değiştirmediyse hazır promptun metni de yeni dile geçer
  if (cur && (langChanged || !$("#prompt-text").value)) $("#prompt-text").value = cur.text;
  const items = list.map((p) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "preset"; b.textContent = p.label;
    b.setAttribute("aria-pressed", String(p.id === store.presetId));
    b.onclick = () => { store.presetId = p.id; $("#prompt-text").value = p.text; renderPresets(); };
    b.oncontextmenu = async (e) => {
      e.preventDefault();
      if (!confirm(t("ed.deletePrompt", { name: p.label }))) return;
      await setSetting(p.builtin
        ? { hidden_presets: [...(app.settings.hidden_presets || []), p.id] }
        : { presets: app.settings.presets.filter((x) => x.id !== p.id) });
      renderPresets();
    };
    return b;
  });
  const add = document.createElement("button");
  add.type = "button"; add.className = "preset add"; add.textContent = t("ed.savePreset");
  add.title = t("ed.savePresetTitle");
  add.onclick = async () => {
    const text = $("#prompt-text").value.trim();
    if (!text) return toast(t("ed.writePromptFirst"));
    const label = prompt(t("ed.namePrompt"));
    if (!label) return;
    const id = "p" + Date.now();
    await setSetting({ presets: [...app.settings.presets, { id, label: label.slice(0, 30), text }] });
    store.presetId = id; renderPresets();
  };
  $("#presets").replaceChildren(...items, add);
}
$("#prompt-text").oninput = () => {
  if (!store.presetId) return;
  store.presetId = null;
  for (const b of document.querySelectorAll(".preset[aria-pressed]")) b.setAttribute("aria-pressed", "false");
};

async function loadModels(provider) {
  if (store.models[provider]) return store.models[provider];
  const r = await api(`/api/keys/${provider}/test`, { method: "POST", body: "{}" });
  store.keyStatus[provider] = r.ok ? "ok" : "bad";
  if (!r.ok) throw new Error(errText(r.code, r.msg));
  store.models[provider] = r.models;
  return r.models;
}
async function refreshProviders() {
  seg($("#provider-seg"), Object.entries(PROVIDERS), store.provider, (id) => {
    store.provider = id; localStorage.setItem("provider", id); refreshProviders();
  });
  const sel = $("#model-select"), hint = $("#provider-hint");
  hint.hidden = true;
  if (!app.keys[store.provider]) {
    sel.replaceChildren(new Option(t("ed.keyRequired"), ""));
    hint.hidden = false;
    hint.innerHTML = `${esc(t("ed.noKeyHint", { provider: PROVIDERS[store.provider] }))} <a href="#ayarlar">${esc(t("ed.addInSettings"))}</a>`;
    return;
  }
  sel.replaceChildren(new Option(t("ed.loadingModels"), ""));
  try {
    const models = await loadModels(store.provider);
    const last = localStorage.getItem(`model-${store.provider}`);
    sel.replaceChildren(...models.map((m) => new Option(m, m)));
    if (last && models.includes(last)) sel.value = last;
  } catch (e) {
    sel.replaceChildren(new Option(t("ed.keyBroken"), ""));
    hint.hidden = false; hint.textContent = e.message;
  }
}
$("#model-select").onchange = (e) => localStorage.setItem(`model-${store.provider}`, e.target.value);

/* Basit Markdown → güvenli HTML */
function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }
function markdown(text) {
  const out = []; let para = [], list = [];
  const flushP = () => { if (para.length) out.push(`<p dir="auto">${inline(para.join(" "))}</p>`); para = []; };
  const flushL = () => { if (list.length) out.push(`<ul>${list.map((l) => `<li dir="auto">${inline(l)}</li>`).join("")}</ul>`); list = []; };
  for (const raw of text.split("\n")) {
    const line = raw.trim(), h = line.match(/^(#{1,3})\s+(.*)$/), li = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (!line) { flushP(); flushL(); }
    else if (h) { flushP(); flushL(); out.push(`<h${h[1].length} dir="auto">${inline(h[2])}</h${h[1].length}>`); }
    else if (li) { flushP(); list.push(li[1]); }
    else { flushL(); para.push(line); }
  }
  flushP(); flushL();
  return out.join("");
}
let editJob = null, editShown = "", renderQueued = false;
const editOut = $("#edit-out");
let editFollow = true;
editOut.addEventListener("scroll", () => (editFollow = atBottom(editOut)));
function renderEdit(final) {
  if (renderQueued && !final) return;
  renderQueued = true;
  setTimeout(() => {
    renderQueued = false;
    editOut.innerHTML = markdown(editShown) + (editJob || !final ? '<span class="caret">▍</span>' : "");
    if (final && !editJob) editOut.querySelector(".caret")?.remove();
    if (editFollow) editOut.scrollTop = editOut.scrollHeight;
  }, final ? 0 : 60);
}
function setEditStatus(...s) { store.editStatus = s; renderEditStatus(); }
function renderEditStatus() {
  const s = store.editStatus;
  $("#edit-status").textContent = s[0] === "raw" ? s[1] : t(...s);
}
const editTyper = new Typer((idle) => renderEdit(idle));

$("#edit-run").onclick = async () => {
  if (editJob) return;
  const text = $("#src-text").value.trim(), promptText = $("#prompt-text").value.trim(), model = $("#model-select").value;
  if (!text) return toast(t("ed.emptySource"));
  if (!promptText) return toast(t("ed.needPrompt"));
  if (!model) return toast(t("ed.needModel"));
  editJob = jobId(); editShown = ""; store.edited = "";
  editOut.innerHTML = '<span class="caret">▍</span>';
  editFollow = true;
  $("#edit-run").disabled = true; $("#edit-stop").disabled = false;
  const provider = PROVIDERS[store.provider];
  setEditStatus("ed.writing", { provider });
  try {
    const res = await fetch("/api/edit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: editJob, provider: store.provider, model, prompt: promptText, text }),
    });
    if (!res.ok) throw new Error(errText((await res.json().catch(() => ({}))).detail || "generic"));
    let waiting = false;
    for await (const ev of ndjson(res)) {
      if (ev.type === "text" || ev.type === "refused" || ev.type === "truncated") {
        const piece = ev.type === "text" ? ev.text : `\n\n${t(`ed.${ev.type}`)}`;
        store.edited += piece; editTyper.push((c) => (editShown += c), piece);
        saveSoon();
        if (waiting) { waiting = false; setEditStatus("ed.writing", { provider }); }
      }
      else if (ev.type === "retry") { waiting = true; setEditStatus("ed.retrying", { seconds: num(ev.seconds) }); }
      else if (ev.type === "done") setEditStatus("ed.doneWith", { provider, model });
      else if (ev.type === "error") {
        const m = errText(ev.code, ev.msg); toast(m); setEditStatus("raw", m);
        if (ev.code === "model") { delete store.models[store.provider]; refreshProviders(); }
      }
    }
  } catch (e) {
    toast(e.message); setEditStatus("raw", e.message);
  } finally {
    editJob = null; save();
    $("#edit-run").disabled = false; $("#edit-stop").disabled = true;
    if (!editTyper.running) renderEdit(true);
  }
};
$("#edit-stop").onclick = () => {
  if (!editJob) return;
  api(`/api/cancel/${editJob}`, { method: "POST" });
  $("#edit-stop").disabled = true;
  editTyper.flush(); setEditStatus("ed.stopped");
};
$("#copy-edit").onclick = (e) => copyText(store.edited, e.currentTarget);
$("#clear-edit").onclick = () => {
  if (editJob || !store.edited || !confirm(t("ed.confirmClear"))) return;
  store.edited = ""; editShown = "";
  editOut.innerHTML = `<p class="muted">${esc(t("ed.outputEmpty"))}</p>`;
  setEditStatus("ed.notYet"); save();
};
$("#export-edit").onclick = () => openExport("edited");

/* ---------- Ayarlar ---------- */
function renderSettings() {
  const uiSel = $("#ui-lang");
  uiSel.replaceChildren(...Object.entries(UI_LANGS).map(([c, n]) => new Option(n, c)));
  uiSel.value = lang;
  uiSel.onchange = async (e) => { await setSetting({ ui_lang: e.target.value }); await setLang(e.target.value); };
  $("#sys-info").textContent = t("st.system", { chip: app.system.chip, ram: num(app.system.ram_gb) });
  renderModels();
  for (const sw of document.querySelectorAll("[data-setting]")) {
    sw.setAttribute("aria-checked", String(!!app.settings[sw.dataset.setting]));
    sw.onclick = () => {
      const on = sw.getAttribute("aria-checked") !== "true";
      sw.setAttribute("aria-checked", String(on));
      if (sw.dataset.setting === "clean") $("#clean-chip").setAttribute("aria-checked", String(on));
      setSetting({ [sw.dataset.setting]: on });
    };
  }
  $("#lang-setting").value = app.settings.language;
  $("#lang-setting").onchange = (e) => { $("#lang-select").value = e.target.value; setSetting({ language: e.target.value }); };
  renderKeys();
  seg($("#theme-seg"), [["system", t("theme.system")], ["light", t("theme.light")], ["dark", t("theme.dark")]], app.settings.theme, (th) => {
    applyTheme(th); setSetting({ theme: th }).then(renderSettings);
  });
}
function renderModels() {
  const recommended = app.system.ram_gb >= 16 ? "large-v3" : app.system.ram_gb >= 8 ? "large-v3-turbo" : "medium";
  $("#model-grid").replaceChildren(...Object.entries(app.models).map(([name, m]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "model-card";
    b.setAttribute("aria-pressed", String(name === app.settings.model));
    const state = m.state === "ready" ? ["ok", "st.downloaded"] : m.state === "downloading" ? ["busy", "st.downloadingNow"]
      : m.state.startsWith("error") ? ["bad", "st.downloadFailed"] : ["", "st.downloadOnSelect"];
    b.innerHTML = `<span class="top"><span class="model-name">${name}</span>${name === recommended ? `<span class="badge ok">${esc(t("st.recommended"))}</span>` : ""}</span>
      <span class="muted small">${esc(t(`model.${name}`))} · ${m.size}</span><span class="badge ${state[0]}" style="align-self:flex-start;margin-top:4px">${esc(t(state[1]))}</span>`;
    b.onclick = () => setSetting({ model: name }).then(renderModels);
    return b;
  }));
}
const KEY_STATUS = {
  none: ["", "key.none"], untested: ["warn", "key.untested"], saved: ["warn", "key.saved"],
  checking: ["busy", "key.checking"], ok: ["ok", "key.ok"], bad: ["bad", "key.bad"],
};
function renderKeys() {
  $("#key-rows").replaceChildren(...Object.entries(PROVIDERS).map(([p, label]) => {
    const row = document.createElement("div");
    row.className = "key-row";
    const st = store.keyStatus[p] || (app.keys[p] ? "saved" : "none");
    row.innerHTML = `
      <div class="top">
        <label for="key-${p}"><strong>${label}</strong></label>
        <span class="badge" role="status"><span class="dot" style="background:currentColor"></span><span></span></span>
        <a href="${KEY_URLS[p]}" target="_blank" rel="noopener">${esc(t("key.get"))}</a>
      </div>
      <div class="row">
        <input type="password" id="key-${p}" autocomplete="off">
        <button type="button" class="btn">${esc(t("key.test"))}</button>
      </div>
      <span class="small key-msg" hidden></span>`;
    const input = row.querySelector("input"), btn = row.querySelector(".row button"), msg = row.querySelector(".key-msg");
    const badge = row.querySelector(".badge");
    const setBadge = (s) => { badge.className = `badge ${KEY_STATUS[s][0]}`; badge.lastChild.textContent = t(KEY_STATUS[s][1]); };
    const showMsg = (cls, text) => { msg.hidden = false; msg.className = `small key-msg ${cls}`; msg.textContent = text; };
    setBadge(st);
    input.placeholder = app.keys[p] ? t("key.savedPlaceholder") : t("key.placeholder", { provider: label });
    if (st === "bad") input.classList.add("bad");
    if (store.keyMsg?.[p]) showMsg(...store.keyMsg[p]);
    if (app.keys[p]) {
      const del = document.createElement("button");
      del.type = "button"; del.className = "linkish"; del.textContent = t("key.delete");
      del.onclick = async () => {
        if (!confirm(t("key.confirmDelete", { provider: label }))) return;
        await api(`/api/keys/${p}`, { method: "DELETE" });
        app.keys[p] = false; delete store.keyStatus[p]; delete store.models[p]; delete store.keyMsg?.[p]; renderKeys();
      };
      row.querySelector(".top").append(del);
    }
    input.oninput = () => {
      store.keyStatus[p] = input.value ? "untested" : (app.keys[p] ? "saved" : "none");
      setBadge(store.keyStatus[p]);
      input.classList.remove("bad"); msg.hidden = true; delete store.keyMsg?.[p];
    };
    btn.onclick = async () => {
      const key = input.value.trim();
      if (!key && !app.keys[p]) return showMsg("warn", t("err.pasteFirst"));
      btn.disabled = true; btn.textContent = t("key.wait");
      store.keyStatus[p] = "checking"; setBadge("checking");
      store.keyMsg = store.keyMsg || {};
      try {
        const r = await api(`/api/keys/${p}/test`, { method: "POST", body: JSON.stringify({ key }) });
        store.keyStatus[p] = r.ok ? "ok" : "bad";
        if (r.ok) { app.keys[p] = true; store.models[p] = r.models; }
        store.keyMsg[p] = r.ok ? ["ok", t("key.success", { n: num(r.models.length) })] : ["bad", errText(r.code, r.msg)];
      } catch (e) {
        store.keyStatus[p] = "bad"; store.keyMsg[p] = ["bad", e.message];
      }
      renderKeys();
    };
    return row;
  }));
}

/* ---------- Dışa aktar ---------- */
const ex = { source: "edited", format: "pdf", font: "notoserif", size: 12, spacing: 1.5 };
function openExport(source) {
  if (!store.segments.length && !store.edited) return toast(t("ex.nothing"));
  ex.source = source === "raw" || !store.edited ? "raw" : "edited";
  $("#ex-name").value = store.fileName || t("ex.defaultName");
  renderExport();
  $("#export-dialog").showModal();
}
function renderExport() {
  if (ex.format === "srt") ex.source = "raw";
  seg($("#ex-source"), [["edited", t("ex.edited"), !store.edited || ex.format === "srt"], ["raw", t("ex.raw"), !store.segments.length]], ex.source,
    (s) => { ex.source = s; renderExport(); });
  $("#ex-formats").replaceChildren(...Object.keys(FORMATS).map((id) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = id.toUpperCase(); b.title = t(`ex.${id}`);
    b.setAttribute("aria-pressed", String(id === ex.format));
    b.disabled = id === "srt" && !store.segments.length;
    b.onclick = () => { ex.format = id; renderExport(); };
    return b;
  }));
  $("#ex-font").replaceChildren(...app.fonts.map((id) => new Option(t(`font.${id}`), id)));
  $("#ex-font").value = ex.font;
  $("#ex-format-desc").textContent = t(`ex.${ex.format}`);
  $("#ex-typo").hidden = !FORMATS[ex.format];
  $("#ex-ts-row").hidden = ex.source !== "raw" || ex.format === "srt";
  seg($("#ex-size"), [11, 12, 14].map((v) => [v, `${num(v)} pt`]), ex.size, (v) => { ex.size = v; renderExport(); });
  seg($("#ex-spacing"), [1.3, 1.5, 2].map((v) => [v, num(v)]), ex.spacing, (v) => { ex.spacing = v; renderExport(); });
  $("#ex-format-name").textContent = ex.format.toUpperCase();
  $("#ex-ext").textContent = "." + ex.format;
  $("#ex-save-label").textContent = t("ex.download", { format: ex.format.toUpperCase() });
  renderPreview();
}
const dateText = () => new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(new Date());
function renderPreview() {
  const typo = FORMATS[ex.format], pv = $("#ex-preview");
  pv.style.fontFamily = typo ? FONT_CSS[ex.font] : "ui-monospace, Menlo, monospace";
  pv.style.fontSize = (typo ? ex.size - 1 : 10) + "px";
  pv.style.lineHeight = String(typo ? ex.spacing : 1.4);
  const title = $("#ex-title-on").checked && ex.format !== "srt";
  const ts = $("#ex-ts").checked;
  let body;
  if (ex.format === "srt") {
    body = store.segments.slice(0, 6).map((s, i) => `<p dir="auto">${i + 1}\n${clock(s.start)} --> ${clock(s.end)}\n${esc(s.text)}</p>`).join("");
  } else if (ex.source === "raw") {
    body = `<p dir="auto">${esc(store.segments.slice(0, 12).map((s) => (ts ? `[${clock(s.start)}] ` : "") + s.text).join(ts ? "\n" : " "))}</p>`;
  } else {
    body = markdown(store.edited.slice(0, 1500)).replace(/<h\d /g, '<p class="h" ').replace(/<\/h\d>/g, "</p>");
  }
  pv.innerHTML = (title ? `<span class="t" dir="auto">${esc($("#ex-name").value || t("ex.defaultName"))}</span><span class="d">${esc(dateText())}</span>` : "") + body;
}
$("#ex-font").onchange = (e) => { ex.font = e.target.value; renderPreview(); };
$("#ex-title-on").onchange = renderPreview;
$("#ex-ts").onchange = renderPreview;
$("#ex-name").oninput = renderPreview;
$("#ex-save").onclick = async () => {
  const name = $("#ex-name").value.trim() || t("ex.defaultName");
  const body = {
    format: ex.format, filename: name, use_raw: ex.source === "raw",
    text: store.edited, segments: store.segments,
    title: $("#ex-title-on").checked ? name : null, date_text: dateText(), timestamps: $("#ex-ts").checked,
    font: ex.font, size: ex.size, spacing: ex.spacing,
  };
  const btn = $("#ex-save"); btn.disabled = true;
  try {
    const res = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(errText((await res.json().catch(() => ({}))).detail || "generic"));
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: `${name}.${ex.format}` });
    a.click(); URL.revokeObjectURL(url);
    $("#export-dialog").close();
    toast(t("ex.downloaded", { name: `${name}.${ex.format}` }));
  } catch (e) { toast(e.message); } finally { btn.disabled = false; }
};

/* ---------- Başlat ---------- */
(async () => {
  try {
    const last = JSON.parse(localStorage.getItem("last") || "null");
    if (last) Object.assign(store, last);
  } catch { /* bozuk kayıt: boş başla */ }
  app = await api("/api/state");
  applyTheme(app.settings.theme);
  $("#clean-chip").setAttribute("aria-checked", String(app.settings.clean));
  for (const p of Object.keys(PROVIDERS)) if (app.keys[p]) store.keyStatus[p] = "saved";
  await setLang(pickLang());
  pollDownloads();
  renderSegments();
  if (store.edited) { editShown = store.edited; renderEdit(true); store.editStatus = ["ed.last"]; renderEditStatus(); }
  if (store.segments.length) $("#src-text").value = rawText();
  show(location.hash.slice(1));
})();
