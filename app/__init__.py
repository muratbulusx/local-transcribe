"""Local Transcribe. Uygulamanın indirdiği her şey (modeller, yazı tipleri, ayarlar) proje klasöründeki
data/ altında durur; klasörü silmek uygulamayı tamamen kaldırır (API anahtarları hariç, onlar
macOS Anahtar Zinciri'ndedir)."""

import os
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# huggingface_hub içe aktarılmadan önce ayarlanmalı; Whisper modelleri buraya iner
os.environ.setdefault("HF_HOME", str(DATA_DIR / "models"))
