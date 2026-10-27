#!/bin/bash
# Local Transcribe kurulumu (macOS, Apple Silicon). Kullanım: ./install.sh
# Mac'in dili Türkçeyse Türkçe, değilse İngilizce mesaj gösterir.
set -e
cd "$(dirname "$0")"
source ./env.sh
mkdir -p data/bin

LOCALE=$(defaults read -g AppleLocale 2>/dev/null || echo en)
if [[ $LOCALE == tr* ]]; then L=tr; else L=en; fi
say() { if [[ $L == tr ]]; then echo "$1"; else echo "$2"; fi; }

echo ""
say "  Local Transcribe kurulumu" "  Local Transcribe setup"
echo "  ────────────────────"

if [[ "$(uname)" != "Darwin" || "$(uname -m)" != "arm64" ]]; then
  say "Şimdilik sadece Apple Silicon (M1 ve sonrası) Mac destekleniyor." \
      "Only Apple Silicon Macs (M1 or later) are supported for now."
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    say "→ ffmpeg kuruluyor (Homebrew)…" "→ Installing ffmpeg (Homebrew)…"
    brew install ffmpeg
  else
    say "ffmpeg gerekli. Önce Homebrew'u kur (https://brew.sh), sonra bu betiği tekrar çalıştır." \
        "ffmpeg is required. Install Homebrew first (https://brew.sh), then run this script again."
    exit 1
  fi
fi

if ! command -v uv >/dev/null 2>&1; then
  say "→ uv (Python paket yöneticisi) kuruluyor…" "→ Installing uv (Python package manager)…"
  curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$HERE/data/bin" INSTALLER_NO_MODIFY_PATH=1 sh
fi

say "→ Python ve paketler kuruluyor…" "→ Installing Python and packages…"
UV_PYTHON_PREFERENCE=only-managed uv sync --python 3.12 --quiet

DF_VERSION=0.5.6
DF_BIN="$HERE/data/bin/deep-filter"
if [[ ! -x "$DF_BIN" ]]; then
  say "→ DeepFilterNet (gürültü temizleme) indiriliyor…" "→ Downloading DeepFilterNet (noise reduction)…"
  curl -fsSL -o "$DF_BIN" \
    "https://github.com/Rikorose/DeepFilterNet/releases/download/v$DF_VERSION/deep-filter-$DF_VERSION-aarch64-apple-darwin" \
    && chmod +x "$DF_BIN" \
    || { rm -f "$DF_BIN"; say "  DeepFilterNet indirilemedi; ffmpeg'in gürültü filtresi kullanılacak." \
                              "  Couldn't download DeepFilterNet; ffmpeg's noise filter will be used instead."; }
fi

CHIP=$(sysctl -n machdep.cpu.brand_string)
RAM=$(( $(sysctl -n hw.memsize) / 1073741824 ))
if   (( RAM >= 16 )); then REC=1
elif (( RAM >= 8 ));  then REC=2
else                       REC=3
fi
mark() { [[ $1 == "$REC" ]] && say "  ← önerilen" "  ← recommended" || true; }

echo ""
say "  Bilgisayar: $CHIP, $RAM GB bellek" "  Computer: $CHIP, $RAM GB memory"
say "  Hangi konuşma tanıma modeli?" "  Which speech recognition model?"
say "    1) large-v3        en doğru, ~3 GB$(mark 1)" "    1) large-v3        most accurate, ~3 GB$(mark 1)"
say "    2) large-v3-turbo  daha hızlı, ~1,6 GB$(mark 2)" "    2) large-v3-turbo  faster, ~1.6 GB$(mark 2)"
say "    3) medium          düşük bellekli bilgisayarlar için, ~1,5 GB$(mark 3)" \
    "    3) medium          for computers with less memory, ~1.5 GB$(mark 3)"
read -r -p "$(say "  Seçim [$REC]: " "  Choice [$REC]: ")" CHOICE
case "${CHOICE:-$REC}" in
  1) MODEL=large-v3 ;;
  2) MODEL=large-v3-turbo ;;
  3) MODEL=medium ;;
  *) say "Geçersiz seçim." "Invalid choice."; exit 1 ;;
esac
echo ""

uv run python -m app.setup --model "$MODEL" --lang "$L"
chmod +x Baslat.command Kurulum.command

echo ""
say "  Kurulum tamam. Başlatmak için 'Baslat.command' dosyasına çift tıkla" \
    "  Setup complete. To start, double-click 'Baslat.command'"
say "  ya da bu klasörde şunu çalıştır:  ./Baslat.command" \
    "  or run this in this folder:  ./Baslat.command"
say "  Model sonradan Ayarlar ekranından değiştirilebilir." \
    "  You can change the model later in Settings."
echo ""
