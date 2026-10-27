"""Yerel web sunucusu: arayüzü sunar, çeviri ve AI düzenlemeyi canlı akış olarak gönderir.

Hata ve durum mesajları kod olarak döner (ör. {"code": "rejected"}); arayüz bunları seçili dile çevirir.
"""

import json
import os
import platform
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.concurrency import iterate_in_threadpool

from . import export, fonts, llm, settings, transcribe

STATIC = Path(__file__).parent / "static"
app = FastAPI(title="Local Transcribe")
_jobs: dict[str, threading.Event] = {}


def _system_info() -> dict:
    chip = platform.processor() or platform.machine()
    try:
        chip = subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"],
                              capture_output=True, text=True).stdout.strip() or chip
    except OSError:
        pass
    ram = round(os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 1024**3)
    return {"chip": chip, "ram_gb": ram}


def _job(job_id: str) -> threading.Event:
    _jobs[job_id] = threading.Event()
    return _jobs[job_id]


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")


@app.get("/api/state")
def state():
    return {
        "settings": settings.load(),
        "models": transcribe.model_status(),
        "keys": {p: bool(settings.get_key(p)) for p in settings.PROVIDERS},
        "fonts": list(fonts.FONTS),
        "system": _system_info(),
    }


@app.post("/api/settings")
def save_settings(changes: dict):
    if "model" in changes and changes["model"] not in transcribe.MODELS:
        raise HTTPException(400, "badModel")
    data = settings.update(changes)
    if "model" in changes and not transcribe.is_downloaded(changes["model"]):
        transcribe.download_async(changes["model"])
    return data


class KeyIn(BaseModel):
    key: str | None = None


@app.post("/api/keys/{provider}/test")
def test_key(provider: str, body: KeyIn):
    """Anahtarı sağlayıcıya sorarak dener; çalışıyorsa kaydeder ve model listesini döndürür."""
    if provider not in settings.PROVIDERS:
        raise HTTPException(404)
    key = (body.key or "").strip() or settings.get_key(provider)
    if not key:
        return {"ok": False, "code": "pasteFirst"}
    try:
        models = llm.list_models(provider, key, settings.load()["dead_models"].get(provider, []))
    except llm.LLMError as e:
        return {"ok": False, "code": e.code, "msg": e.msg}
    settings.set_key(provider, key)
    return {"ok": True, "models": models}


@app.delete("/api/keys/{provider}")
def delete_key(provider: str):
    settings.delete_key(provider)
    return {"ok": True}


@app.post("/api/cancel/{job_id}")
def cancel(job_id: str):
    if job_id in _jobs:
        _jobs[job_id].set()
    return {"ok": True}


async def _ndjson(request: Request, events, cancel_ev: threading.Event):
    """Olayları satır satır JSON olarak akıtır. Sayfa yenilenir ya da kapanırsa işi durdurur
    ve üreteci kapatır, böylece geçici dosyalar silinir ve sonraki işler beklemez."""
    try:
        async for ev in iterate_in_threadpool(events):
            if await request.is_disconnected():
                break
            yield json.dumps(ev, ensure_ascii=False) + "\n"
    finally:
        cancel_ev.set()
        try:
            events.close()
        except ValueError:
            pass  # üreteç o an iş parçacığında çalışıyor; iptal bayrağını görüp kendisi duracak


@app.post("/api/transcribe")
def transcribe_file(request: Request, file: UploadFile = File(...), job_id: str = Form(...)):
    cfg = settings.load()
    suffix = Path(file.filename or "ses").suffix or ".bin"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    with tmp:
        shutil.copyfileobj(file.file, tmp)
    cancel_ev = _job(job_id)

    def events():
        try:
            yield from transcribe.run(tmp.name, cfg["model"], cfg["language"],
                                      cfg["clean"], cfg["vad"], cfg["norm"], cancel_ev)
        except subprocess.CalledProcessError:
            yield {"type": "error", "code": "fileRead"}
        except Exception as e:
            yield {"type": "error", "code": "transcribe", "msg": str(e)}
        finally:
            os.unlink(tmp.name)
            _jobs.pop(job_id, None)

    return StreamingResponse(_ndjson(request, events(), cancel_ev), media_type="application/x-ndjson")


class EditIn(BaseModel):
    job_id: str
    provider: str
    model: str
    prompt: str
    text: str


@app.post("/api/edit")
def edit(request: Request, body: EditIn):
    key = settings.get_key(body.provider)
    if not key:
        raise HTTPException(400, "noKeyForProvider")
    cancel_ev = _job(body.job_id)

    def events():
        try:
            for piece in llm.edit(body.provider, key, body.model, body.prompt, body.text, cancel_ev):
                if piece is llm.REFUSED:
                    yield {"type": "refused"}
                elif piece is llm.TRUNCATED:
                    yield {"type": "truncated"}
                elif isinstance(piece, llm.Retry):
                    yield {"type": "retry", "seconds": piece.seconds}
                else:
                    yield {"type": "text", "text": piece}
            yield {"type": "done"}
        except llm.LLMError as e:
            if e.code == "model":  # bir daha listede gösterilmesin
                dead = dict(settings.load()["dead_models"])
                dead[body.provider] = sorted({*dead.get(body.provider, []), body.model})
                settings.update({"dead_models": dead})
            yield {"type": "error", "code": e.code, "msg": e.msg}
        finally:
            _jobs.pop(body.job_id, None)

    return StreamingResponse(_ndjson(request, events(), cancel_ev), media_type="application/x-ndjson")


class ExportIn(BaseModel):
    format: str
    filename: str = "transcript"
    text: str | None = None
    segments: list[dict] | None = None
    use_raw: bool = False
    title: str | None = None
    date_text: str = ""  # arayüz kendi dilinde biçimlendirir
    timestamps: bool = False
    font: str = "notoserif"
    size: int = 12
    spacing: float = 1.5


MIME = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain; charset=utf-8",
    "srt": "application/x-subrip; charset=utf-8",
}


@app.post("/api/export")
def export_file(body: ExportIn):
    if body.format not in MIME or body.font not in fonts.FONTS:
        raise HTTPException(400, "badFormat")
    try:
        data = export.build(body.format, text=body.text, segments=body.segments, use_raw=body.use_raw,
                            title=body.title, date_text=body.date_text, timestamps=body.timestamps,
                            font_id=body.font, size=body.size, spacing=body.spacing)
    except OSError:
        raise HTTPException(500, "fontFailed")
    name = f"{body.filename or 'transcript'}.{body.format}"
    return Response(data, media_type=MIME[body.format],
                    headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(name)}"})


@app.on_event("startup")
def _prepare_fonts():
    # Arayüz ve PDF önizlemesi aynı TTF'leri kullanır; kurulumda inmediyse ilk açılışta iner
    threading.Thread(target=lambda: _try(fonts.ensure_all), daemon=True).start()


def _try(fn):
    try:
        fn()
    except OSError:
        pass


fonts.FONT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/fonts", StaticFiles(directory=fonts.FONT_DIR), name="fonts")
app.mount("/static", StaticFiles(directory=STATIC), name="static")
