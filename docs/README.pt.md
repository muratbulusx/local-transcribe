# Local Transcribe

[English](../README.md) · [Türkçe](README.tr.md) · [Español](README.es.md) · **Português** · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

Transforme gravações de aulas e tutoriais em texto no seu próprio Mac, sem enviar o áudio para lugar nenhum.
A transcrição aparece linha por linha enquanto você acompanha. Se quiser, depois você pode pedir ao Gemini, Claude ou
OpenAI que a revise com o seu próprio prompt e baixá-la como PDF, Word, TXT ou legendas SRT.

> **Por enquanto, só macOS.** O Local Transcribe funciona em Macs com Apple Silicon (M1 ou posterior). Windows e Linux ainda não são suportados. A seção "Windows e Linux" abaixo lista o que é preciso para suportá-los.

## Recursos

- **Transcrição ao vivo:** solte um arquivo de áudio ou vídeo e o texto vai aparecendo com marcações de tempo.
- **Funciona com gravações difíceis:** redução de ruído com IA (DeepFilterNet), equalização de volume para quem fala baixo e pulo de silêncios para que o modelo não invente frases.
- **Roda localmente:** o reconhecimento de fala usa o Whisper na GPU do Mac (Apple MLX). Seu áudio nunca sai do seu computador.
- **Edição com IA com o seu próprio prompt:** escolha Gemini, Claude ou OpenAI, escreva o que você quer (“corrija a ortografia e adicione títulos”, “resuma em tópicos”) e veja o resultado chegar em tempo real. Salve os prompts que você mais usa.
- **Exportação:** PDF e Word com fontes incorporadas (textos em turco, cirílico, árabe, chinês e japonês saem certos na impressão), texto simples ou legendas SRT com tempo.
- **10 idiomas de interface:** turco, inglês, espanhol, português, francês, alemão, russo, árabe, chinês e japonês.

## Requisitos

- Um Mac com Apple Silicon (M1 ou posterior)
- Cerca de 6 GB de espaço livre em disco
- Conexão com a internet durante a instalação (para baixar o modelo de fala)
- Opcional: uma chave de API do Google (Gemini), da Anthropic (Claude) ou da OpenAI para a edição com IA

## Instalação

1. Baixe ou clone este repositório.

   Com git:

   ```bash
   git clone https://github.com/muratbulusx/local-transcribe.git
   ```

2. Clique duas vezes em **`Kurulum.command`** (“Instalação”). Uma janela do Terminal se abre e instala tudo o que é necessário: ffmpeg, Python, os pacotes e o DeepFilterNet.
3. Ele sugere um modelo de fala com base na memória do seu Mac. Pressione Return para aceitar ou escolha outro.

Se o macOS disser que o arquivo é de um desenvolvedor não identificado, clique nele com o botão direito e escolha **Abrir**.
Você também pode executar `./install.sh` no Terminal.

## Iniciando o app

Clique duas vezes em **`Baslat.command`** (“Iniciar”). O app abre no seu navegador em `http://127.0.0.1:8765`.
Fechar essa janela do Terminal encerra o app.

## Como funciona

| Etapa | Ferramenta | Onde roda |
|---|---|---|
| Remoção de ruído e chiado | DeepFilterNet (se não estiver disponível, usa o ffmpeg `afftdn`) | Seu Mac |
| Preparação do áudio, equalização de volume | ffmpeg (`dynaudnorm`) | Seu Mac |
| Pulo de silêncios | Silero VAD | Seu Mac |
| Fala para texto | Whisper (MLX, GPU da Apple) | Seu Mac |
| Edição com IA (opcional) | Gemini / Claude / OpenAI | Os servidores do provedor, com a sua própria chave de API |

## Modelos de fala

| Modelo | Tamanho | Ideal para |
|---|---|---|
| large-v3 | ~3 GB | Máxima precisão (recomendado para Macs com 16 GB ou mais) |
| large-v3-turbo | ~1,6 GB | Mais rápido, um pouco menos preciso |
| medium | ~1,5 GB | Macs com menos memória |

Você pode trocar de modelo depois em Ajustes. O novo modelo é baixado na primeira vez que você o seleciona.

## Privacidade

- A transcrição é totalmente local. Arquivos de áudio e vídeo nunca são enviados.
- Só a etapa de edição com IA envia texto, e apenas para o provedor que você escolher.
- As chaves de API ficam guardadas no Acesso às Chaves do macOS. Todo o resto (ajustes, modelos de fala, Python, fontes) fica na pasta `data/` dentro da pasta do app, então apagar a pasta remove tudo.
- Nos planos gratuitos, os provedores de IA podem usar o texto enviado para melhorar seus produtos. Leve isso em conta com material confidencial.

## Solução de problemas

- **“Port 8765 is in use by another program”:** outro app está usando essa porta. Execute `LOCAL_TRANSCRIBE_PORT=8766 ./Baslat.command` para usar uma diferente. (Se o próprio Local Transcribe já estiver rodando, clicar duas vezes em `Baslat.command` de novo só abre o navegador.)
- **O teste da chave diz “recusada”:** a chave provavelmente foi cortada ao copiar. Cole de novo.
- **Palavras são entendidas errado:** experimente um modelo maior, defina o idioma da transcrição em vez de usar a detecção automática e use a edição com IA para corrigir termos pelo contexto.

## Windows e Linux

Por enquanto o app só funciona no macOS com Apple Silicon. A maior parte (a interface web, o servidor, a detecção de silêncio, a edição com IA e a exportação) já é multiplataforma. Estas partes dependem do Mac e precisariam mudar:

| Parte | Agora (macOS) | Necessário para Windows / Linux |
|---|---|---|
| Reconhecimento de fala | `mlx-whisper`, que só roda na GPU da Apple | `faster-whisper` (GPU NVIDIA com CUDA, ou CPU) ou `whisper.cpp` (Vulkan para GPUs AMD e Intel). Eles usam outro formato de modelo, então a lista de modelos e o downloader precisam de um segundo conjunto de modelos. |
| Pacotes Python | `mlx-whisper` é instalado em todos os sistemas | Marcadores de plataforma no `pyproject.toml` para que cada sistema receba o motor de fala certo |
| Instalação e início | `Kurulum.command`, `Baslat.command`, `install.sh` (bash, comandos do macOS) | Scripts `.bat`/PowerShell para Windows e `.sh` para Linux que façam os mesmos passos com `uv` |
| ffmpeg | Instalado com Homebrew | `winget` ou um ffmpeg incluído no Windows; `apt`/`dnf` no Linux |
| DeepFilterNet | Binário para Apple Silicon | A mesma versão também tem binários para Windows e Linux; o instalador precisa baixar o certo |
| Armazenamento das chaves de API | Acesso às Chaves do macOS | Gerenciador de Credenciais do Windows e Secret Service do Linux (o `keyring` já suporta os dois), mais uma alternativa para sistemas Linux sem chaveiro |
| Verificações do sistema | `sysctl` (memória, chip) e `defaults` (idioma) | O jeito de cada sistema de ler memória, GPU e idioma |

- Sem uma GPU NVIDIA, o large-v3 roda na CPU e fica várias vezes mais lento. Lá, `large-v3-turbo` ou `medium` seriam um padrão melhor.
- Cada plataforma precisa ser testada em hardware real.

Contribuições são bem-vindas: abra uma issue ou um pull request.

## Licença

MIT. Veja [LICENSE](../LICENSE).
