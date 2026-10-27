"""Kurulumda çalışır: seçilen Whisper modelini, yazı tiplerini ve sessizlik modelini önceden hazırlar."""

import argparse

from . import fonts, settings, transcribe

MESSAGES = {
    "tr": {
        "model": "→ Whisper {model} indiriliyor ({size}). İnternet hızına göre birkaç dakika sürebilir…",
        "failed": "Model indirilemedi. İnternet bağlantını kontrol edip kurulumu tekrar çalıştır.",
        "fonts": "→ PDF yazı tipleri indiriliyor…",
        "vad": "→ Sessizlik algılama modeli hazırlanıyor…",
        "ready": "✓ Hazır.",
    },
    "en": {
        "model": "→ Downloading Whisper {model} ({size}). This can take a few minutes depending on your connection…",
        "failed": "Couldn't download the model. Check your internet connection and run setup again.",
        "fonts": "→ Downloading PDF fonts…",
        "vad": "→ Preparing the silence detection model…",
        "ready": "✓ Ready.",
    },
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=list(transcribe.MODELS), required=True)
    parser.add_argument("--lang", choices=list(MESSAGES), default="en")
    args = parser.parse_args()
    msg = MESSAGES[args.lang]

    settings.update({"model": args.model})
    print(msg["model"].format(model=args.model, size=transcribe.MODELS[args.model]["size"]))
    transcribe.download(args.model)
    if not transcribe.is_downloaded(args.model):
        raise SystemExit(msg["failed"])

    print(msg["fonts"])
    fonts.ensure_all()

    print(msg["vad"])
    from silero_vad import load_silero_vad
    load_silero_vad()
    print(msg["ready"])


if __name__ == "__main__":
    main()
