# Ses Çevirme

[English](../README.md) · [Türkçe](README.tr.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [العربية](README.ar.md) · **简体中文** · [日本語](README.ja.md)

在你自己的 Mac 上把讲课和教程录音转成文字，音频无需上传到任何地方。
转写文本会在你眼前逐行出现。如果需要，你还可以让 Gemini、Claude 或 OpenAI
按你自己的提示词整理文本，并下载为 PDF、Word、TXT 或 SRT 字幕。

## 功能

- **实时转写：** 拖入音频或视频文件，带时间戳的文字便会实时显示。
- **应对难处理的录音：** AI 降噪（DeepFilterNet）、为说话声音较小的人进行音量均衡，以及跳过静音，避免模型凭空编造句子。
- **在本地运行：** 语音识别使用 Mac GPU 上的 Whisper（Apple MLX）。你的音频永远不会离开你的电脑。
- **用你自己的提示词进行 AI 编辑：** 选择 Gemini、Claude 或 OpenAI，写下你的要求（“修正错别字并添加标题”“总结为要点列表”），即可看到结果实时生成。常用的提示词可以存储起来。
- **导出：** 嵌入字体的 PDF 和 Word（土耳其语、西里尔字母、阿拉伯语、中文和日文文本都能正确打印）、纯文本，或带时间的 SRT 字幕。
- **10 种界面语言：** 土耳其语、英语、西班牙语、葡萄牙语、法语、德语、俄语、阿拉伯语、中文和日语。

## 系统要求

- 搭载 Apple 芯片（M1 或更新）的 Mac
- 约 5 GB 可用磁盘空间
- 安装期间需要联网（用于下载语音模型）
- 可选：用于 AI 编辑的 Google（Gemini）、Anthropic（Claude）或 OpenAI API 密钥

## 安装

1. 下载或克隆此仓库。

   使用 git：

   ```bash
   git clone https://github.com/muratbulusx/local-transcribe.git
   ```

2. 连按 **`Kurulum.command`**（“安装”）。随后会打开一个“终端”窗口，并安装所需的一切：ffmpeg、Python、相关软件包和 DeepFilterNet。
3. 它会根据你的 Mac 内存推荐一个语音模型。按下 Return 键接受，或选择其他模型。

如果 macOS 提示该文件来自身份不明的开发者，请右键点按该文件并选取 **打开**。
你也可以改为在“终端”中运行 `./install.sh`。

## 启动 App

连按 **`Baslat.command`**（“启动”）。App 会在浏览器中打开，地址为 `http://127.0.0.1:8765`。
关闭该“终端”窗口即可停止 App。

## 工作原理

| 步骤 | 工具 | 运行位置 |
|---|---|---|
| 去除噪声和嘶嘶声 | DeepFilterNet（备用方案为 ffmpeg `afftdn`） | 你的 Mac |
| 音频准备、音量均衡 | ffmpeg（`dynaudnorm`） | 你的 Mac |
| 跳过静音 | Silero VAD | 你的 Mac |
| 语音转文字 | Whisper（MLX，Apple GPU） | 你的 Mac |
| AI 编辑（可选） | Gemini / Claude / OpenAI | 服务商的服务器，使用你自己的 API 密钥 |

## 语音模型

| 模型 | 大小 | 适用场景 |
|---|---|---|
| large-v3 | 约 3 GB | 准确度最高（推荐 16 GB 及以上内存的 Mac） |
| large-v3-turbo | 约 1.6 GB | 更快，准确度略低 |
| medium | 约 1.5 GB | 内存较少的 Mac |

你之后可以在“设置”中切换模型。新模型会在首次选择时下载。

## 隐私

- 转写完全在本地进行。音频和视频文件从不上传。
- 只有 AI 编辑步骤会发送文本，且只发送给你选择的服务商。
- API 密钥存储在 macOS 钥匙串中。其他所有内容（设置、语音模型、Python、字体）都在应用文件夹内的 `data/` 文件夹中，删除该文件夹即可全部移除。
- 在免费方案中，AI 服务商可能会使用你发送的文本来改进其产品。处理机密内容时请注意。

## 故障排除

- **“Port 8765 is in use by another program”：** 另一个 App 正在使用该端口。运行 `SES_CEVIRME_PORT=8766 ./Baslat.command` 即可改用其他端口。（如果 Ses Çevirme 本身已经在运行，再次连按 `Baslat.command` 只会打开浏览器。）
- **密钥测试显示“已拒绝”：** 密钥可能在拷贝时被截断了。请重新粘贴。
- **词语被听错：** 尝试使用更大的模型，指定转写语言而不是自动检测，并使用 AI 编辑根据上下文修正术语。

## 许可证

MIT。详见 [LICENSE](../LICENSE)。
