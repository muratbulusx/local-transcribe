"""Ses hazırlama: ffmpeg ile çözme, gürültü temizleme, seviye dengeleme ve sessizlik ayıklama."""

import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np

from .settings import DATA_DIR

SAMPLE_RATE = 16000
DF_BIN = DATA_DIR / "bin" / "deep-filter"
DF_ATTEN_DB = 40  # tam bastırma yerine 40 dB sınır: konuşmayı bozmadan gürültüyü indirir
MAX_CHUNK_SEC = 28  # Whisper 30 sn'lik pencerelerle çalışır
MIN_CHUNK_SEC = 1.0

_vad_model = None


def duration(src: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", src],
        capture_output=True, text=True, check=True,
    )
    return float(json.loads(out.stdout)["format"]["duration"])


def deepfilter_available() -> bool:
    return DF_BIN.exists()


def _deepfilter(src: str, workdir: Path) -> str:
    """DeepFilterNet ile gürültü temizler; model 48 kHz mono WAV ister."""
    wav48 = workdir / "girdi.wav"
    subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-i", src, "-vn", "-ac", "1", "-ar", "48000",
         "-af", "highpass=f=70", str(wav48)],
        check=True,
    )
    out_dir = workdir / "temiz"
    subprocess.run(
        [str(DF_BIN), "-D", "-a", str(DF_ATTEN_DB), "-o", str(out_dir), str(wav48)],
        check=True, capture_output=True,
    )
    return str(out_dir / wav48.name)


def decode(src: str, clean: bool, norm: bool) -> np.ndarray:
    """Dosyayı 16 kHz mono float32 diziye çevirir, istenirse filtreler."""
    with tempfile.TemporaryDirectory() as tmp:
        filters = ["highpass=f=70"]
        if clean and deepfilter_available():
            src = _deepfilter(src, Path(tmp))
        elif clean:
            # DeepFilterNet yoksa ffmpeg'in FFT tabanlı gürültü azaltması
            filters.append("afftdn=nr=12:nf=-30:tn=1")
        if norm:
            # Kısık bölümleri yükseltip yüksekleri bastıran dinamik dengeleme
            filters.append("dynaudnorm=f=200:g=11:p=0.9")
        proc = subprocess.run(
            ["ffmpeg", "-nostdin", "-v", "error", "-i", src, "-vn", "-ac", "1",
             "-ar", str(SAMPLE_RATE), "-af", ",".join(filters), "-f", "f32le", "-"],
            capture_output=True, check=True,
        )
    return np.frombuffer(proc.stdout, dtype=np.float32).copy()


def _speech_timestamps(audio: np.ndarray) -> list[tuple[int, int]]:
    global _vad_model
    import torch
    from silero_vad import get_speech_timestamps, load_silero_vad

    if _vad_model is None:
        _vad_model = load_silero_vad()
    stamps = get_speech_timestamps(
        torch.from_numpy(audio), _vad_model, sampling_rate=SAMPLE_RATE,
        min_silence_duration_ms=400, speech_pad_ms=250, threshold=0.4,
    )
    return [(s["start"], s["end"]) for s in stamps]


def chunks(audio: np.ndarray, use_vad: bool) -> list[tuple[int, int]]:
    """Sesi Whisper'a verilecek en fazla ~28 sn'lik parçalara böler."""
    max_len = MAX_CHUNK_SEC * SAMPLE_RATE
    if not use_vad:
        return [(i, min(i + max_len, len(audio))) for i in range(0, len(audio), max_len)]

    merged: list[tuple[int, int]] = []
    for start, end in _speech_timestamps(audio):
        # Tek başına çok uzun konuşmaları böl
        while end - start > max_len:
            merged.append((start, start + max_len))
            start += max_len
        if merged and end - merged[-1][0] <= max_len:
            merged[-1] = (merged[-1][0], end)
        else:
            merged.append((start, end))
    return [(s, e) for s, e in merged if e - s >= MIN_CHUNK_SEC * SAMPLE_RATE]
