"""Gemini, Claude ve OpenAI ile prompta göre metin düzenleme (akışlı)."""

import math
import re
import threading

# Uzun metinler cümle sınırından bu boyda parçalara bölünür. Küçük parçalarda model metni
# kısaltmadan tam işler; tek istekte koca bir ders gönderilince özetleyip erken bitiriyordu.
CHUNK_CHARS = 8000
SENTENCE_BREAK = re.compile(r"(\s*\n\s*|(?<=[.!?…؟])\s+|(?<=[。！？]))")

RETRY_DELAYS = (3, 8, 20)  # geçici hatalarda (503, dakikalık limit) bekleme süreleri, saniye
TRANSIENT_STATUS = {500, 502, 503, 504, 529}

# Sunucu taraflı yedek modele geçişi destekleyen Claude modelleri
CLAUDE_FALLBACK_MODELS = {"claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"}
CLAUDE_PREFERRED = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]

OPENAI_SKIP = ("audio", "realtime", "tts", "transcribe", "image", "embedding", "search", "moderation", "instruct")

SYSTEM = (
    "You are a transcript editor. You will receive an automatically generated transcript of a "
    "lecture or tutorial video, plus the user's instruction. Apply the instruction and return only "
    "the resulting text, with no preamble, explanation or commentary. Use Markdown for headings "
    "(#, ##) and '- ' for bullet points when needed. Write in the language of the transcript "
    "unless the instruction asks for another language. Keep all of the content: don't shorten "
    "or summarize unless the instruction asks for it.\n\nUser's instruction:\n"
)

REFUSED = object()  # model bir bölümü düzenlemeyi reddetti; arayüz kendi dilinde not gösterir
TRUNCATED = object()  # model bir bölümü çıktı sınırında kesti


class Retry:
    """Geçici bir hatadan sonra `seconds` saniye beklenip aynı bölüm yeniden isteniyor."""

    def __init__(self, seconds: int):
        self.seconds = seconds


class LLMError(Exception):
    """code: arayüzün çevirdiği hata kodu (rejected, quota, network, unknown); msg: ham ayrıntı."""

    def __init__(self, code: str, msg: str = ""):
        super().__init__(msg or code)
        self.code, self.msg = code, msg


def _version(model_id: str) -> float:
    m = re.search(r"-(\d+(?:\.\d+)?)", model_id)
    return float(m.group(1)) if m else 0.0


def _sort_models(ids: list[str], preferred: list[str]) -> list[str]:
    head = [m for m in preferred if m in ids]
    rest = sorted((m for m in ids if m not in head), reverse=True)
    return head + sorted(rest, key=_version, reverse=True)


# "-latest" adları Google'ın her zaman en güncel sürüme yönlendirdiği takma adlar;
# flash-lite ücretsiz katmanda en yüksek günlük limite sahip olduğu için başta.
GEMINI_PREFERRED = ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-pro-latest"]
GEMINI_SKIP = ("tts", "image", "banana", "robotics", "computer-use", "customtools", "transcribe", "embedding")


def list_models(provider: str, key: str, dead: list[str] = ()) -> list[str]:
    """Anahtarı doğrular: geçersizse LLMError fırlatır, geçerliyse kullanılabilir modelleri döndürür.
    dead: daha önce "artık kullanılamıyor" hatası veren modeller, listeye konmaz."""
    try:
        if provider == "gemini":
            from google import genai

            client = genai.Client(api_key=key)
            ids = []
            for m in client.models.list():
                name = m.name.removeprefix("models/")
                actions = getattr(m, "supported_actions", None) or []
                if (name.startswith("gemini") and "generateContent" in actions
                        and not any(s in name for s in GEMINI_SKIP)):
                    ids.append(name)
            # 1.x ve 2.x modeller yeni anahtarlara kapatıldı (404 "no longer available");
            # kararlı sürümü olan önizlemeler de gereksiz kalabalık.
            ids = [m for m in ids if not re.match(r"gemini-[12][.-]", m)
                   and not (m.endswith("-preview") and m.removesuffix("-preview") in ids)]
            return _sort_models([m for m in ids if m not in dead], GEMINI_PREFERRED)
        if provider == "claude":
            import anthropic

            client = anthropic.Anthropic(api_key=key)
            ids = [m.id for m in client.models.list() if m.id not in dead]
            return _sort_models(ids, CLAUDE_PREFERRED)
        if provider == "openai":
            import openai

            client = openai.OpenAI(api_key=key)
            ids = [m.id for m in client.models.list()
                   if m.id.startswith(("gpt-", "o")) and not any(s in m.id for s in OPENAI_SKIP)
                   and m.id not in dead]
            return _sort_models(ids, [])
    except Exception as e:
        raise _classify(e) from e
    raise LLMError("unknown")


def _status(e: Exception) -> int | None:
    code = getattr(e, "status_code", None) or getattr(e, "code", None)
    return code if isinstance(code, int) else None


def _classify(e: Exception) -> LLMError:
    text = str(e)
    low = text.lower()
    if _status(e) == 404 or any(s in low for s in ("not_found", "no longer available", "does not exist")):
        return LLMError("model", text[:300])
    if any(s in low for s in ("401", "403", "api key", "api_key", "authentication", "permission", "invalid")):
        return LLMError("rejected", text[:300])
    if any(s in low for s in ("429", "quota", "rate")):
        return LLMError("quota", text[:300])
    if any(s in low for s in ("connect", "timeout", "network", "resolve")):
        return LLMError("network", text[:300])
    return LLMError("other", text[:300])


def _retry_delay(e: Exception, attempt: int) -> int | None:
    """Geçici hatada kaç saniye beklenip tekrar deneneceği; kalıcı hatada None."""
    if attempt >= len(RETRY_DELAYS):
        return None
    status, text = _status(e), str(e)
    if status == 429 or "RESOURCE_EXHAUSTED" in text:
        if "PerDay" in text or "per day" in text.lower():
            return None  # günlük kota; ertesi güne kadar açılmaz
        m = re.search(r"retry in ([\d.]+)\s*s", text, re.I) or re.search(r"retryDelay['\"]?:\s*['\"](\d+)s", text)
        return min(math.ceil(float(m.group(1))) + 1, 60) if m else RETRY_DELAYS[attempt]
    if status in TRANSIENT_STATUS or any(s in text for s in ("UNAVAILABLE", "overloaded", "Overloaded")):
        return RETRY_DELAYS[attempt]
    if any(s in type(e).__name__ for s in ("Connection", "Timeout")):
        return RETRY_DELAYS[attempt]
    return None


def _hard_split(unit: str) -> list[str]:
    """Cümle sonu olmayan çok uzun bir bloğu boşluklardan böler."""
    out = []
    while len(unit) > CHUNK_CHARS:
        cut = unit.rfind(" ", 0, CHUNK_CHARS)
        cut = cut if cut > CHUNK_CHARS // 2 else CHUNK_CHARS
        out.append(unit[:cut])
        unit = unit[cut:]
    return out + [unit]


def split_text(text: str) -> list[str]:
    """Metni cümle ya da paragraf sınırından en fazla CHUNK_CHARS karakterlik parçalara böler."""
    pieces = SENTENCE_BREAK.split(text)  # [cümle, ayraç, cümle, ayraç, …]
    parts, cur = [], ""
    for i in range(0, len(pieces), 2):
        sep = pieces[i + 1] if i + 1 < len(pieces) else ""
        for unit in _hard_split(pieces[i]):
            if cur.strip() and len(cur) + len(unit) > CHUNK_CHARS:
                parts.append(cur.strip())
                cur = ""
            cur += unit
        cur += sep
    if cur.strip():
        parts.append(cur.strip())
    return parts


def _stream_one(provider: str, key: str, model: str, system: str, text: str):
    if provider == "gemini":
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=key)
        finish = None
        for chunk in client.models.generate_content_stream(
            model=model, contents=text,
            config=types.GenerateContentConfig(system_instruction=system),
        ):
            if chunk.text:
                yield chunk.text
            if chunk.prompt_feedback and chunk.prompt_feedback.block_reason:
                finish = "BLOCKED"
            if chunk.candidates and chunk.candidates[0].finish_reason:
                finish = getattr(chunk.candidates[0].finish_reason, "name", str(chunk.candidates[0].finish_reason))
        if finish == "MAX_TOKENS":
            yield TRUNCATED
        elif finish in ("BLOCKED", "SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"):
            yield REFUSED
    elif provider == "claude":
        import anthropic

        client = anthropic.Anthropic(api_key=key)
        kwargs = dict(model=model, max_tokens=64000, system=system,
                      messages=[{"role": "user", "content": text}])
        if model in CLAUDE_FALLBACK_MODELS:
            ctx = client.beta.messages.stream(
                **kwargs, betas=["server-side-fallback-2026-07-01"], fallbacks="default")
        else:
            ctx = client.messages.stream(**kwargs)
        with ctx as stream:
            yield from stream.text_stream
            stop = stream.get_final_message().stop_reason
            if stop == "refusal":
                yield REFUSED
            elif stop == "max_tokens":
                yield TRUNCATED
    elif provider == "openai":
        import openai

        client = openai.OpenAI(api_key=key)
        stream = client.chat.completions.create(
            model=model, stream=True,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": text}],
        )
        finish = None
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
            if chunk.choices and chunk.choices[0].finish_reason:
                finish = chunk.choices[0].finish_reason
        if finish == "length":
            yield TRUNCATED
        elif finish == "content_filter":
            yield REFUSED
    else:
        raise LLMError("unknown")


def edit(provider: str, key: str, model: str, prompt: str, text: str, cancel: threading.Event):
    """Düzenlenmiş metni parça parça üretir: str, REFUSED, TRUNCATED ya da Retry."""
    parts = split_text(text)
    for i, part in enumerate(parts):
        if cancel.is_set():
            return
        system = SYSTEM + prompt
        if len(parts) > 1:
            system += (f"\n\nNote: you are editing part {i + 1} of {len(parts)} of a long text. "
                       "The parts will be joined in order, so don't write an intro or a closing line.")
        if i:
            yield "\n\n"
        attempt = 0
        while True:
            started = False
            try:
                for piece in _stream_one(provider, key, model, system, part):
                    if cancel.is_set():
                        return
                    started = True
                    yield piece
                break
            except LLMError:
                raise
            except Exception as e:
                # Yazmaya başlamış bir bölüm tekrarlanırsa metin iki kez yazılır; o yüzden sadece
                # hiç çıktı gelmeden düşen istekler yeniden denenir.
                delay = None if started else _retry_delay(e, attempt)
                if delay is None:
                    raise _classify(e) from e
                yield Retry(delay)
                if cancel.wait(delay):
                    return
                attempt += 1
