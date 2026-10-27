# Kurulum ve başlatma betiklerinin ortak ayarları: Python, paket önbelleği ve modeller
# proje klasöründeki data/ altında tutulur, böylece klasörü silmek her şeyi kaldırır.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export UV_CACHE_DIR="$HERE/data/uv-cache"
export UV_PYTHON_INSTALL_DIR="$HERE/data/python"
# "only-managed" olunca uv mevcut .venv'i tanımayıp her başlatmada baştan kuruyor;
# kurulumda install.sh only-managed ile data/python'a kurduğu için burada managed yeterli.
export UV_PYTHON_PREFERENCE=managed
export HF_HOME="$HERE/data/models"
export PATH="$HERE/data/bin:$HOME/.local/bin:/opt/homebrew/bin:$PATH"
