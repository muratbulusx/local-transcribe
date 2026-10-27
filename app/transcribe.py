"""Whisper (MLX, Apple GPU) ile parça parça, canlı akan transkripsiyon."""

import re
import threading

from huggingface_hub import snapshot_download

from . import audio

MODELS = {
    "large-v3": {"repo": "mlx-community/whisper-large-v3-mlx", "size": "~3 GB"},
    "large-v3-turbo": {"repo": "mlx-community/whisper-large-v3-turbo", "size": "~1.6 GB"},
    "medium": {"repo": "mlx-community/whisper-medium-mlx", "size": "~1.5 GB"},
}

# Whisper'ın Türkçe sessizlik/müzik bölümlerinde sık uydurduğu kalıplar
HALLUCINATIONS = re.compile(
    r"^(altyazı.*|izlediğiniz için teşekkür.*|abone ol.*|beğenmeyi unutmayın.*|"
    r"bir sonraki videoda görüşmek üzere.*|thank you for watching.*|subtitles by.*)$",
    re.IGNORECASE,
)

_lock = threading.Lock()  # GPU'da aynı anda tek iş
_downloads: dict[str, str] = {}  # model -> "downloading" | "error: ..."


def is_downloaded(name: str) -> bool:
    try:
        snapshot_download(MODELS[name]["repo"], local_files_only=True)
        return True
    except Exception:
        return False


def model_status() -> dict:
    return {
        name: {**info, "state": _downloads.get(name) or ("ready" if is_downloaded(name) else "missing")}
        for name, info in MODELS.items()
    }


def download(name: str) -> None:
    _downloads[name] = "downloading"
    try:
        snapshot_download(MODELS[name]["repo"])
        _downloads.pop(name, None)
    except Exception as e:  # ağ hatası vb.
        _downloads[name] = f"error: {e}"


def download_async(name: str) -> None:
    if _downloads.get(name) != "downloading":
        threading.Thread(target=download, args=(name,), daemon=True).start()


def run(src: str, model: str, language: str, clean: bool, vad: bool, norm: bool, cancel: threading.Event):
    """Olay sözlükleri üretir: info, segment, progress, done, error."""
    import mlx_whisper

    repo = MODELS[model]["repo"]
    if not is_downloaded(model):
        yield {"type": "status", "code": "download", "model": model, "size": MODELS[model]["size"]}

    cleaning = clean and audio.deepfilter_available()
    yield {"type": "status", "code": "denoise" if cleaning else "prepare"}
    total_sec = audio.duration(src)
    samples = audio.decode(src, clean=clean, norm=norm)
    parts = audio.chunks(samples, use_vad=vad)
    yield {"type": "info", "duration": total_sec, "chunks": len(parts)}

    lang = None if language == "auto" else language
    for start, end in parts:
        if cancel.is_set():
            yield {"type": "cancelled"}
            return
        offset = start / audio.SAMPLE_RATE
        # Kilit sadece GPU çağrısı boyunca tutulur; yield sırasında tutulursa, yarıda
        # bırakılan bir akış (ör. sayfa yenilenince) kilidi sonsuza kadar kilitli bırakır
        with _lock:
            result = mlx_whisper.transcribe(
                samples[start:end],
                path_or_hf_repo=repo,
                language=lang,
                condition_on_previous_text=False,
                no_speech_threshold=0.6,
                logprob_threshold=-1.0,
                compression_ratio_threshold=2.4,
                temperature=(0.0, 0.2, 0.4, 0.6),
            )
        for seg in result["segments"]:
            text = seg["text"].strip()
            if not text or HALLUCINATIONS.match(text):
                continue
            if seg.get("no_speech_prob", 0) > 0.6 and seg.get("avg_logprob", 0) < -1.0:
                continue
            yield {
                "type": "segment",
                "start": round(offset + seg["start"], 2),
                "end": round(offset + seg["end"], 2),
                "text": text,
                "unsure": seg.get("avg_logprob", 0) < -0.9,
            }
        yield {"type": "progress", "pct": round(100 * end / max(len(samples), 1), 1),
               "position": round(end / audio.SAMPLE_RATE, 1)}
    yield {"type": "done"}
