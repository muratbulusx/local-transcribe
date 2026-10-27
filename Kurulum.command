#!/bin/bash
# Çift tıklayınca kurulumu başlatır. Bitince Baslat.command ile uygulamayı açabilirsin.
cd "$(dirname "$0")"
bash ./install.sh
STATUS=$?
echo ""
read -r -n 1 -s -p "Kapatmak için bir tuşa bas…"
echo ""
exit $STATUS
