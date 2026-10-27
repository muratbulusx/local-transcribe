# Ses Çevirme

[English](../README.md) · [Türkçe](README.tr.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · **Deutsch** · [Русский](README.ru.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

Verwandle Aufnahmen von Vorlesungen und Tutorials direkt auf deinem Mac in Text – ohne das Audio irgendwohin hochzuladen.
Das Transkript erscheint Zeile für Zeile, während du zusiehst. Wenn du möchtest, kannst du es anschließend von Gemini, Claude oder
OpenAI mit deinem eigenen Prompt überarbeiten lassen und als PDF, Word, TXT oder SRT-Untertitel herunterladen.

## Funktionen

- **Live-Transkription:** Zieh eine Audio- oder Videodatei hinein und der Text erscheint fortlaufend mit Zeitstempeln.
- **Auch für schwierige Aufnahmen:** KI-Rauschunterdrückung (DeepFilterNet), Lautstärkeausgleich für leise Sprecher und Stille überspringen, damit das Modell keine Sätze erfindet.
- **Läuft lokal:** Die Spracherkennung nutzt Whisper auf der GPU des Mac (Apple MLX). Dein Audio verlässt nie deinen Computer.
- **KI-Bearbeitung mit deinem eigenen Prompt:** Wähle Gemini, Claude oder OpenAI, schreib, was du möchtest („Korrigiere die Rechtschreibung und füge Überschriften ein“, „Fasse in Stichpunkten zusammen“), und sieh zu, wie das Ergebnis live erscheint. Speichere Prompts, die du oft verwendest.
- **Export:** PDF und Word mit eingebetteten Schriften (türkische, kyrillische, arabische, chinesische und japanische Texte werden alle korrekt gedruckt), reiner Text oder SRT-Untertitel mit Zeitangaben.
- **10 Sprachen für die Benutzeroberfläche:** Türkisch, Englisch, Spanisch, Portugiesisch, Französisch, Deutsch, Russisch, Arabisch, Chinesisch und Japanisch.

## Voraussetzungen

- Ein Mac mit Apple Chip (M1 oder neuer)
- Etwa 5 GB freier Speicherplatz
- Eine Internetverbindung während der Installation (zum Laden des Spracherkennungsmodells)
- Optional: ein API-Schlüssel von Google (Gemini), Anthropic (Claude) oder OpenAI für die KI-Bearbeitung

## Installation

1. Lade dieses Repository herunter oder klone es.

   Mit git:

   ```bash
   git clone https://github.com/muratbulusx/local-transcribe.git
   ```

2. Doppelklicke auf **`Kurulum.command`** („Installation“). Ein Terminal-Fenster öffnet sich und installiert alles Nötige: ffmpeg, Python, die Pakete und DeepFilterNet.
3. Es schlägt ein Spracherkennungsmodell passend zum Arbeitsspeicher deines Mac vor. Drück die Eingabetaste, um es zu übernehmen, oder wähle ein anderes.

Meldet macOS, dass die Datei von einem nicht verifizierten Entwickler stammt, klicke sie mit der rechten Maustaste an und wähle **Öffnen**.
Alternativ kannst du auch `./install.sh` im Terminal ausführen.

## App starten

Doppelklicke auf **`Baslat.command`** („Starten“). Die App öffnet sich in deinem Browser unter `http://127.0.0.1:8765`.
Wenn du dieses Terminal-Fenster schließt, wird die App beendet.

## So funktioniert’s

| Schritt | Tool | Wo es läuft |
|---|---|---|
| Rauschen und Zischen entfernen | DeepFilterNet (ersatzweise ffmpeg `afftdn`) | Dein Mac |
| Audio vorbereiten, Lautstärkeausgleich | ffmpeg (`dynaudnorm`) | Dein Mac |
| Stille überspringen | Silero VAD | Dein Mac |
| Sprache zu Text | Whisper (MLX, Apple GPU) | Dein Mac |
| KI-Bearbeitung (optional) | Gemini / Claude / OpenAI | Die Server des Anbieters, mit deinem eigenen API-Schlüssel |

## Spracherkennungsmodelle

| Modell | Größe | Ideal für |
|---|---|---|
| large-v3 | ~3 GB | Höchste Genauigkeit (empfohlen für Macs ab 16 GB) |
| large-v3-turbo | ~1,6 GB | Schneller, etwas weniger genau |
| medium | ~1,5 GB | Macs mit weniger Arbeitsspeicher |

Du kannst das Modell später in den Einstellungen wechseln. Das neue Modell wird geladen, wenn du es zum ersten Mal auswählst.

## Datenschutz

- Die Transkription läuft vollständig lokal. Audio- und Videodateien werden nie hochgeladen.
- Nur bei der KI-Bearbeitung wird Text gesendet – und nur an den Anbieter, den du auswählst.
- API-Schlüssel werden im macOS-Schlüsselbund gespeichert. Alles andere (Einstellungen, Sprachmodelle, Python, Schriften) liegt im Ordner `data/` im App-Ordner – wer den Ordner löscht, entfernt alles.
- In kostenlosen Tarifen dürfen KI-Anbieter den gesendeten Text zur Verbesserung ihrer Produkte nutzen. Denk daran bei vertraulichen Inhalten.

## Fehlerbehebung

- **"Port 8765 is in use by another program":** Eine andere App verwendet diesen Port. Führe `SES_CEVIRME_PORT=8766 ./Baslat.command` aus, um einen anderen zu nutzen. (Läuft Ses Çevirme selbst bereits, öffnet ein erneuter Doppelklick auf `Baslat.command` einfach den Browser.)
- **Der Schlüsseltest meldet „abgelehnt“:** Der Schlüssel wurde beim Kopieren wahrscheinlich abgeschnitten. Füge ihn erneut ein.
- **Wörter werden falsch erkannt:** Probier ein größeres Modell, leg die Transkriptionssprache fest, statt sie automatisch erkennen zu lassen, und nutze die KI-Bearbeitung, um Begriffe anhand des Kontexts zu korrigieren.

## Lizenz

MIT. Siehe [LICENSE](../LICENSE).
