# Ses Çevirme

**English** · [Türkçe](docs/README.tr.md) · [Español](docs/README.es.md) · [Português](docs/README.pt.md) · [Français](docs/README.fr.md) · [Deutsch](docs/README.de.md) · [Русский](docs/README.ru.md) · [العربية](docs/README.ar.md) · [简体中文](docs/README.zh.md) · [日本語](docs/README.ja.md)

Turn lecture and tutorial recordings into text on your own Mac, without uploading the audio anywhere.
The transcript appears line by line while you watch. If you want, you can then have Gemini, Claude or
OpenAI clean it up with your own prompt and download it as PDF, Word, TXT or SRT subtitles.

## Features

- **Live transcription:** drop in an audio or video file and the text streams in with timestamps.
- **Works on difficult recordings:** AI noise reduction (DeepFilterNet), volume balancing for quiet speakers, and silence skipping so the model doesn't invent sentences.
- **Runs locally:** speech recognition uses Whisper on the Mac's GPU (Apple MLX). Your audio never leaves your computer.
- **AI editing with your own prompt:** pick Gemini, Claude or OpenAI, write what you want ("fix the spelling and add headings", "summarize as bullet points"), and watch the result stream in. Save the prompts you use often.
- **Export:** PDF and Word with embedded fonts (Turkish, Cyrillic, Arabic, Chinese and Japanese text all print correctly), plain text, or timed SRT subtitles.
- **10 interface languages:** Turkish, English, Spanish, Portuguese, French, German, Russian, Arabic, Chinese and Japanese.

## Requirements

- A Mac with Apple Silicon (M1 or later)
- About 5 GB of free disk space
- An internet connection during setup (to download the speech model)
- Optional: an API key from Google (Gemini), Anthropic (Claude) or OpenAI for AI editing

## Installation

1. Download or clone this repository.

   With git:

   ```bash
   git clone https://github.com/muratbulusx/local-transcribe.git
   ```

2. Double-click **`Kurulum.command`** ("Setup"). A Terminal window opens and installs everything it needs: ffmpeg, Python, the packages and DeepFilterNet.
3. It suggests a speech model based on your Mac's memory. Press Enter to accept, or pick another one.

If macOS says the file is from an unidentified developer, right-click it and choose **Open**.
You can also run `./install.sh` in Terminal instead.

## Starting the app

Double-click **`Baslat.command`** ("Start"). The app opens in your browser at `http://127.0.0.1:8765`.
Closing that Terminal window stops the app.

## How it works

| Step | Tool | Where it runs |
|---|---|---|
| Noise and hiss removal | DeepFilterNet (falls back to ffmpeg `afftdn`) | Your Mac |
| Audio preparation, volume balancing | ffmpeg (`dynaudnorm`) | Your Mac |
| Silence skipping | Silero VAD | Your Mac |
| Speech to text | Whisper (MLX, Apple GPU) | Your Mac |
| AI editing (optional) | Gemini / Claude / OpenAI | The provider's servers, with your own API key |

## Speech models

| Model | Size | Best for |
|---|---|---|
| large-v3 | ~3 GB | Highest accuracy (recommended for 16 GB Macs and up) |
| large-v3-turbo | ~1.6 GB | Faster, slightly less accurate |
| medium | ~1.5 GB | Macs with less memory |

You can switch models later in Settings. The new model downloads the first time you select it.

## Privacy

- Transcription is fully local. Audio and video files are never uploaded.
- Only the AI editing step sends text, and only to the provider you choose.
- API keys are stored in the macOS Keychain. Everything else (settings, speech models, Python, fonts) lives in the `data/` folder inside the app folder, so deleting the folder removes it all.
- On free tiers, AI providers may use the text you send to improve their products. Keep that in mind for confidential material.

## Troubleshooting

- **"Port 8765 is in use by another program":** another app is using that port. Run `SES_CEVIRME_PORT=8766 ./Baslat.command` to use a different one. (If Ses Çevirme itself is already running, double-clicking `Baslat.command` again just opens the browser.)
- **The key test says "rejected":** the key was probably cut off when copying. Paste it again.
- **Words are misheard:** try a bigger model, set the transcription language instead of auto-detect, and use AI editing to fix terms from context.

## License

MIT. See [LICENSE](LICENSE).
