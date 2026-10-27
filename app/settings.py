"""Ayarlar (JSON dosyası) ve API anahtarları (macOS Anahtar Zinciri)."""

import json
import threading

import keyring

from . import DATA_DIR

SETTINGS_FILE = DATA_DIR / "settings.json"
KEYRING_SERVICE = "ses-cevirme"
PROVIDERS = ("gemini", "claude", "openai")

BUILTIN_PRESETS = ("not", "duzelt", "ozet")  # metinleri arayüz dilinde i18n dosyalarından gelir

DEFAULTS = {
    "model": "large-v3",
    "language": "tr",
    "ui_lang": None,  # None: tarayıcı/sistem dilinden seçilir
    "clean": True,
    "vad": True,
    "norm": True,
    "theme": "system",
    "presets": [],  # kullanıcının kaydettiği promptlar
    "hidden_presets": [],  # silinen hazır promptlar
    "dead_models": {},  # sağlayıcı → "artık kullanılamıyor" hatası veren modeller
}

_lock = threading.Lock()


def load() -> dict:
    data = dict(DEFAULTS)
    if SETTINGS_FILE.exists():
        try:
            data.update(json.loads(SETTINGS_FILE.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError):
            pass
    # Eski sürümler hazır promptları da buraya kaydediyordu
    data["presets"] = [p for p in data["presets"] if p.get("id") not in BUILTIN_PRESETS]
    return data


def update(changes: dict) -> dict:
    with _lock:
        data = load()
        data.update({k: v for k, v in changes.items() if k in DEFAULTS})
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        SETTINGS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return data


def get_key(provider: str) -> str | None:
    return keyring.get_password(KEYRING_SERVICE, provider)


def set_key(provider: str, key: str) -> None:
    keyring.set_password(KEYRING_SERVICE, provider, key)


def delete_key(provider: str) -> None:
    try:
        keyring.delete_password(KEYRING_SERVICE, provider)
    except keyring.errors.PasswordDeleteError:
        pass
