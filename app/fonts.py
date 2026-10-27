"""PDF'e gömülecek yazı tipleri (Google Fonts'tan bir kez indirilir).

Ana yazı tipleri Latin ve Kiril alfabelerini kapsar. Arapça, Çince ve Japonca metinler için
yedek yazı tipleri sadece metinde o alfabe geçtiğinde indirilir.
"""

import re
import urllib.parse
import urllib.request

from .settings import DATA_DIR

FONT_DIR = DATA_DIR / "fonts"

FONTS = {
    "inter": "Inter",
    "notosans": "Noto Sans",
    "notoserif": "Noto Serif",
    "lora": "Lora",
}

# alfabe -> (dosya kimliği, Google Fonts ailesi, karakter aralığı)
SCRIPTS = {
    "arabic": ("arabic", "Noto Sans Arabic", r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]"),
    "japanese": ("jp", "Noto Sans JP", r"[぀-ヿ]"),
    "chinese": ("sc", "Noto Sans SC", r"[一-鿿㐀-䶿]"),
}


def path(font_id: str, bold: bool):
    return FONT_DIR / f"{font_id}-{700 if bold else 400}.ttf"


def _download(font_id: str, family: str, weights=(400, 700)) -> None:
    if all(path(font_id, w == 700).exists() for w in weights):
        return
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    query = urllib.parse.quote_plus(family) + ":wght@" + ";".join(map(str, weights))
    # Tanınmayan bir istemciye Google, alt kümeye bölünmemiş tam TTF dosyaları döndürür
    req = urllib.request.Request(f"https://fonts.googleapis.com/css2?family={query}",
                                 headers={"User-Agent": "curl/8"})
    css = urllib.request.urlopen(req, timeout=30).read().decode()
    for weight, url in re.findall(r"font-weight:\s*(\d+);.*?url\((https://[^)]+\.ttf)\)", css, re.S):
        target = path(font_id, weight == "700")
        if not target.exists():
            urllib.request.urlretrieve(url, target)


def ensure(font_id: str) -> None:
    _download(font_id, FONTS[font_id])


def ensure_all() -> None:
    for font_id in FONTS:
        ensure(font_id)


def fallbacks_for(text: str) -> list[tuple[str, str]]:
    """Metinde geçen ve ana yazı tipinde olmayan alfabeler için (kimlik, dosya yolu) listesi."""
    needed = []
    japanese = re.search(SCRIPTS["japanese"][2], text)
    for script, (font_id, family, pattern) in SCRIPTS.items():
        if script == "chinese" and japanese:
            continue  # Japonca yazı tipi Kanji'yi de kapsar
        if re.search(pattern, text):
            _download(font_id, family, weights=(400,))
            needed.append((font_id, str(path(font_id, False))))
    return needed


def is_rtl(text: str) -> bool:
    letters = re.findall(r"[^\W\d_]", text)
    arabic = re.findall(SCRIPTS["arabic"][2], text)
    return bool(letters) and len(arabic) > len(letters) / 2
