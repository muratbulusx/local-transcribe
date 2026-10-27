"""Uygulamayı başlatır: python -m app"""

import os
import socket
import subprocess
import sys
import threading
import urllib.request
import webbrowser

import uvicorn

HOST = "127.0.0.1"
PORT = int(os.environ.get("LOCAL_TRANSCRIBE_PORT") or os.environ.get("SES_CEVIRME_PORT") or "8765")
URL = f"http://{HOST}:{PORT}"


def _turkish() -> bool:
    try:
        locale = subprocess.run(["defaults", "read", "-g", "AppleLocale"], capture_output=True, text=True).stdout
    except OSError:
        locale = os.environ.get("LANG", "")
    return locale.startswith("tr")


TR = _turkish()
MSG = {
    "running": (f"Local Transcribe zaten açık: {URL}", f"Local Transcribe is already running: {URL}"),
    "port": (f"{PORT} portu başka bir program tarafından kullanılıyor. LOCAL_TRANSCRIBE_PORT ile başka bir port seçebilirsin.",
             f"Port {PORT} is in use by another program. Set LOCAL_TRANSCRIBE_PORT to use a different port."),
    "started": (f"Local Transcribe çalışıyor: {URL}  (kapatmak için bu pencerede Ctrl+C)",
                f"Local Transcribe is running: {URL}  (press Ctrl+C in this window to stop)"),
}


def msg(key: str) -> str:
    return MSG[key][0 if TR else 1]


def port_in_use() -> bool:
    with socket.socket() as s:
        return s.connect_ex((HOST, PORT)) == 0


def already_running() -> bool:
    try:
        with urllib.request.urlopen(f"{URL}/api/state", timeout=3) as r:
            return r.status == 200
    except OSError:
        return False


if __name__ == "__main__":
    open_browser = not (os.environ.get("LOCAL_TRANSCRIBE_NO_BROWSER") or os.environ.get("SES_CEVIRME_NO_BROWSER"))
    if port_in_use():
        if already_running():
            print(msg("running"))
            if open_browser:
                webbrowser.open(URL)
            sys.exit(0)
        sys.exit(msg("port"))
    if open_browser:
        threading.Timer(1.5, lambda: webbrowser.open(URL)).start()
    print(msg("started"))
    uvicorn.run("app.server:app", host=HOST, port=PORT, log_level="warning")
