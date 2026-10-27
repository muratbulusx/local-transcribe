# Ses Çevirme

[English](../README.md) · [Türkçe](README.tr.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · **日本語**

講義やチュートリアルの録音を、音声をどこにもアップロードせずに、自分の Mac 上でテキストに変換できます。
文字起こし結果は目の前で 1 行ずつ表示されます。必要に応じて、Gemini、Claude、または
OpenAI に自分のプロンプトでテキストを整えてもらい、PDF、Word、TXT、または SRT 字幕としてダウンロードできます。

> **現在は macOS のみ対応です。** Ses Çevirme は Apple Silicon（M1 以降）搭載の Mac で動作します。Windows と Linux にはまだ対応していません。対応に必要な作業は下の「Windows と Linux」セクションにまとめています。

## 機能

- **リアルタイム文字起こし：** 音声または動画ファイルをドロップすると、タイムスタンプ付きのテキストが順に表示されます。
- **聞き取りにくい録音にも対応：** AI によるノイズ除去（DeepFilterNet）、声の小さい話者のための音量の均一化、そしてモデルが文を作り出さないようにする無音スキップを備えています。
- **ローカルで動作：** 音声認識には Mac の GPU 上で動く Whisper（Apple MLX）を使用します。音声がコンピュータの外に出ることはありません。
- **自分のプロンプトで AI 編集：** Gemini、Claude、OpenAI から選び、やりたいこと（「誤字を直して見出しを付けて」「箇条書きで要約して」）を書くと、結果がリアルタイムで表示されます。よく使うプロンプトは保存できます。
- **書き出し：** フォントを埋め込んだ PDF と Word（トルコ語、キリル文字、アラビア語、中国語、日本語のテキストもすべて正しく印刷されます）、プレーンテキスト、またはタイムコード付きの SRT 字幕に書き出せます。
- **10 の表示言語：** トルコ語、英語、スペイン語、ポルトガル語、フランス語、ドイツ語、ロシア語、アラビア語、中国語、日本語に対応しています。

## 必要なもの

- Apple シリコン（M1 以降）搭載の Mac
- 約 6 GB の空きディスク容量
- セットアップ中のインターネット接続（音声モデルのダウンロードに必要です）
- 任意：AI 編集用の Google（Gemini）、Anthropic（Claude）、または OpenAI の API キー

## インストール

1. このリポジトリをダウンロードまたはクローンします。

   git の場合：

   ```bash
   git clone https://github.com/muratbulusx/local-transcribe.git
   ```

2. **`Kurulum.command`**（「セットアップ」）をダブルクリックします。ターミナルのウインドウが開き、ffmpeg、Python、各種パッケージ、DeepFilterNet など必要なものがすべてインストールされます。
3. Mac のメモリ容量に応じて音声モデルが提案されます。Return キーを押して確定するか、別のモデルを選んでください。

macOS で「開発元が未確認」と表示された場合は、ファイルを右クリックして **開く** を選択してください。
代わりにターミナルで `./install.sh` を実行することもできます。

## アプリの起動

**`Baslat.command`**（「起動」）をダブルクリックします。アプリがブラウザの `http://127.0.0.1:8765` で開きます。
そのターミナルのウインドウを閉じると、アプリは終了します。

## しくみ

| ステップ | ツール | 実行場所 |
|---|---|---|
| ノイズとヒスノイズの除去 | DeepFilterNet（使えない場合は ffmpeg `afftdn`） | お使いの Mac |
| 音声の準備、音量の均一化 | ffmpeg（`dynaudnorm`） | お使いの Mac |
| 無音スキップ | Silero VAD | お使いの Mac |
| 音声からテキストへ | Whisper（MLX、Apple GPU） | お使いの Mac |
| AI 編集（任意） | Gemini / Claude / OpenAI | プロバイダのサーバ（自分の API キーを使用） |

## 音声モデル

| モデル | サイズ | 用途 |
|---|---|---|
| large-v3 | 約 3 GB | 最高精度（メモリ 16 GB 以上の Mac におすすめ） |
| large-v3-turbo | 約 1.6 GB | より高速、精度はやや低め |
| medium | 約 1.5 GB | メモリが少ない Mac |

モデルはあとから「設定」で切り替えられます。新しいモデルは、初めて選択したときにダウンロードされます。

## プライバシー

- 文字起こしは完全にローカルで行われます。音声ファイルや動画ファイルがアップロードされることはありません。
- テキストを送信するのは AI 編集のステップだけで、送信先は選択したプロバイダのみです。
- API キーは macOS のキーチェーンに保存されます。それ以外（設定、音声モデル、Python、フォント）はすべてアプリフォルダ内の `data/` フォルダにあり、フォルダを削除すればすべて消えます。
- 無料プランでは、AI プロバイダーが送信されたテキストを製品改善に使うことがあります。機密性の高い内容には注意してください。

## トラブルシューティング

- **「Port 8765 is in use by another program」：** 別のアプリがそのポートを使用しています。`SES_CEVIRME_PORT=8766 ./Baslat.command` を実行すると、別のポートを使用できます。（Ses Çevirme 自体がすでに実行中の場合は、`Baslat.command` をもう一度ダブルクリックしてもブラウザが開くだけです。）
- **キーのテストで「拒否」と表示される：** コピー時にキーが途中で切れた可能性があります。もう一度貼り付けてください。
- **言葉が聞き間違えられる：** より大きいモデルを試す、自動検出ではなく文字起こし言語を指定する、AI 編集で文脈から用語を直す、といった方法をお試しください。

## Windows と Linux

現在、このアプリは Apple Silicon 搭載の macOS でのみ動作します。大部分（Web インターフェース、サーバー、無音検出、AI 編集、書き出し）はすでにクロスプラットフォームです。Mac に依存していて変更が必要なのは次の部分です。

| 部分 | 現在（macOS） | Windows / Linux で必要なこと |
|---|---|---|
| 音声認識 | Apple の GPU でしか動かない `mlx-whisper` | `faster-whisper`（CUDA 対応の NVIDIA GPU または CPU）か `whisper.cpp`（AMD・Intel GPU 向けの Vulkan）。モデル形式が異なるため、モデル一覧とダウンローダーに 2 つ目のモデルセットが必要です。 |
| Python パッケージ | どのシステムにも `mlx-whisper` がインストールされる | 各システムに適した音声エンジンが入るよう、`pyproject.toml` にプラットフォーム条件を追加 |
| セットアップと起動 | `Kurulum.command`、`Baslat.command`、`install.sh`（bash、macOS のコマンド） | 同じ手順を `uv` で行う、Windows 用の `.bat`/PowerShell スクリプトと Linux 用の `.sh` スクリプト |
| ffmpeg | Homebrew でインストール | Windows では `winget` か同梱の ffmpeg、Linux では `apt`/`dnf` |
| DeepFilterNet | Apple Silicon 用バイナリ | 同じリリースに Windows 用と Linux 用のバイナリもあるので、インストーラーが正しいものを取得する必要があります |
| API キーの保存 | macOS のキーチェーン | Windows の資格情報マネージャーと Linux の Secret Service（`keyring` はどちらにも対応済み）、キーリングのない Linux 向けの代替手段 |
| システムの確認 | `sysctl`（メモリ、チップ）と `defaults`（言語） | 各システムでメモリ・GPU・言語を取得する方法 |

- NVIDIA GPU がない場合、large-v3 は CPU で動作し、数倍遅くなります。その環境では `large-v3-turbo` か `medium` を既定にするのがよいでしょう。
- 各プラットフォームは実機でテストする必要があります。

コントリビューション歓迎です。issue または pull request を送ってください。

## ライセンス

MIT。[LICENSE](../LICENSE) を参照してください。
