#!/bin/bash
# Çift tıklayınca uygulamayı başlatır ve tarayıcıda açar. Kapatmak için bu pencerede Ctrl+C.
cd "$(dirname "$0")"
source ./env.sh
exec uv run python -m app
