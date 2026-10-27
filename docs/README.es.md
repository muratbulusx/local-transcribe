# Ses Çevirme

[English](../README.md) · [Türkçe](README.tr.md) · **Español** · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

Convierte grabaciones de clases y tutoriales en texto en tu propio Mac, sin subir el audio a ningún sitio.
La transcripción aparece línea a línea mientras la miras. Si quieres, luego puedes pedir a Gemini, Claude u
OpenAI que la pulan con tu propia instrucción y descargarla como PDF, Word, TXT o subtítulos SRT.

> **Por ahora solo macOS.** Ses Çevirme funciona en Mac con Apple Silicon (M1 o posterior). Windows y Linux todavía no son compatibles. La sección "Windows y Linux" más abajo explica qué hace falta para darles soporte.

## Funciones

- **Transcripción en directo:** suelta un archivo de audio o vídeo y el texto va apareciendo con marcas de tiempo.
- **Funciona con grabaciones difíciles:** reducción de ruido con IA (DeepFilterNet), equilibrado de volumen para quienes hablan bajo y omisión de silencios para que el modelo no se invente frases.
- **Se ejecuta en local:** el reconocimiento de voz usa Whisper en la GPU del Mac (Apple MLX). Tu audio nunca sale de tu ordenador.
- **Edición con IA con tu propia instrucción:** elige Gemini, Claude u OpenAI, escribe lo que quieres («corrige la ortografía y añade títulos», «resume en viñetas») y mira cómo llega el resultado. Guarda las instrucciones que más uses.
- **Exportación:** PDF y Word con fuentes incrustadas (el texto en turco, cirílico, árabe, chino y japonés se imprime correctamente), texto plano o subtítulos SRT con tiempos.
- **10 idiomas de interfaz:** turco, inglés, español, portugués, francés, alemán, ruso, árabe, chino y japonés.

## Requisitos

- Un Mac con Apple Silicon (M1 o posterior)
- Unos 6 GB de espacio libre en disco
- Conexión a internet durante la instalación (para descargar el modelo de voz)
- Opcional: una clave de API de Google (Gemini), Anthropic (Claude) u OpenAI para la edición con IA

## Instalación

1. Descarga o clona este repositorio.

   Con git:

   ```bash
   git clone https://github.com/muratbulusx/local-transcribe.git
   ```

2. Haz doble clic en **`Kurulum.command`** («Instalación»). Se abre una ventana de Terminal que instala todo lo necesario: ffmpeg, Python, los paquetes y DeepFilterNet.
3. Te sugiere un modelo de voz según la memoria de tu Mac. Pulsa Intro para aceptarlo o elige otro.

Si macOS dice que el archivo es de un desarrollador no identificado, haz clic derecho sobre él y elige **Abrir**.
También puedes ejecutar `./install.sh` en Terminal.

## Iniciar la app

Haz doble clic en **`Baslat.command`** («Iniciar»). La app se abre en tu navegador en `http://127.0.0.1:8765`.
Al cerrar esa ventana de Terminal, la app se detiene.

## Cómo funciona

| Paso | Herramienta | Dónde se ejecuta |
|---|---|---|
| Eliminación de ruido y siseo | DeepFilterNet (si no está disponible, usa ffmpeg `afftdn`) | Tu Mac |
| Preparación del audio, equilibrado de volumen | ffmpeg (`dynaudnorm`) | Tu Mac |
| Omisión de silencios | Silero VAD | Tu Mac |
| Voz a texto | Whisper (MLX, GPU de Apple) | Tu Mac |
| Edición con IA (opcional) | Gemini / Claude / OpenAI | Los servidores del proveedor, con tu propia clave de API |

## Modelos de voz

| Modelo | Tamaño | Ideal para |
|---|---|---|
| large-v3 | ~3 GB | Máxima precisión (recomendado para Macs de 16 GB o más) |
| large-v3-turbo | ~1,6 GB | Más rápido, algo menos preciso |
| medium | ~1,5 GB | Macs con menos memoria |

Puedes cambiar de modelo más adelante en Ajustes. El nuevo modelo se descarga la primera vez que lo seleccionas.

## Privacidad

- La transcripción es totalmente local. Los archivos de audio y vídeo nunca se suben.
- Solo el paso de edición con IA envía texto, y únicamente al proveedor que elijas.
- Las claves de API se guardan en el Llavero de macOS. Todo lo demás (ajustes, modelos de voz, Python, fuentes) está en la carpeta `data/` dentro de la carpeta de la app, así que al borrar la carpeta se elimina todo.
- En los planes gratuitos, los proveedores de IA pueden usar el texto enviado para mejorar sus productos. Tenlo en cuenta con material confidencial.

## Solución de problemas

- **«Port 8765 is in use by another program»:** otra app está usando ese puerto. Ejecuta `SES_CEVIRME_PORT=8766 ./Baslat.command` para usar otro. (Si Ses Çevirme ya está en marcha, al volver a hacer doble clic en `Baslat.command` solo se abre el navegador).
- **La prueba de la clave dice «rechazada»:** seguramente la clave se cortó al copiarla. Vuelve a pegarla.
- **Se entienden mal algunas palabras:** prueba un modelo más grande, indica el idioma de transcripción en lugar de usar la detección automática y usa la edición con IA para corregir términos según el contexto.

## Windows y Linux

Por ahora la app solo funciona en macOS con Apple Silicon. La mayor parte (la interfaz web, el servidor, la detección de silencios, la edición con IA y la exportación) ya es multiplataforma. Estas partes dependen del Mac y habría que cambiarlas:

| Parte | Ahora (macOS) | Necesario para Windows / Linux |
|---|---|---|
| Reconocimiento de voz | `mlx-whisper`, que solo funciona en la GPU de Apple | `faster-whisper` (GPU NVIDIA con CUDA, o CPU) o `whisper.cpp` (Vulkan para GPU AMD e Intel). Usan otro formato de modelo, así que la lista de modelos y el descargador necesitan un segundo conjunto de modelos. |
| Paquetes de Python | `mlx-whisper` se instala en todos los sistemas | Marcadores de plataforma en `pyproject.toml` para que cada sistema reciba el motor de voz adecuado |
| Instalación e inicio | `Kurulum.command`, `Baslat.command`, `install.sh` (bash, comandos de macOS) | Scripts `.bat`/PowerShell para Windows y `.sh` para Linux que hagan los mismos pasos con `uv` |
| ffmpeg | Se instala con Homebrew | `winget` o un ffmpeg incluido en Windows; `apt`/`dnf` en Linux |
| DeepFilterNet | Binario para Apple Silicon | La misma versión también publica binarios para Windows y Linux; el instalador debe descargar el correcto |
| Almacenamiento de claves de API | Llavero de macOS | Administrador de credenciales de Windows y Secret Service de Linux (`keyring` ya admite ambos), más una alternativa para sistemas Linux sin llavero |
| Comprobaciones del sistema | `sysctl` (memoria, chip) y `defaults` (idioma) | La forma propia de cada sistema de leer la memoria, la GPU y el idioma |

- Sin una GPU NVIDIA, large-v3 se ejecuta en la CPU y es varias veces más lento. Allí sería mejor usar `large-v3-turbo` o `medium` por defecto.
- Cada plataforma tiene que probarse en hardware real.

Las contribuciones son bienvenidas: abre un issue o un pull request.

## Licencia

MIT. Consulta [LICENSE](../LICENSE).
