# Ses Çevirme

[English](../README.md) · **Türkçe** · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

Ders ve konu anlatımı kayıtlarını kendi Mac'inde, sesi hiçbir yere yüklemeden metne çevir.
Transkript sen izlerken satır satır yazılır. İstersen sonra Gemini, Claude ya da OpenAI'a kendi
promptunla düzelttirip PDF, Word, TXT veya SRT altyazı olarak indirebilirsin.

## Özellikler

- **Canlı çeviri:** Ses ya da video dosyasını bırak, metin zaman damgalarıyla akarak gelsin.
- **Zor kayıtlarda da çalışır:** Yapay zekâ ile gürültü temizleme (DeepFilterNet), kısık konuşmalar için ses seviyesi dengeleme ve modelin cümle uydurmaması için sessizlik ayıklama.
- **Yerelde çalışır:** Konuşma tanıma, Mac'in GPU'sunda Whisper ile yapılır (Apple MLX). Sesin bilgisayarından çıkmaz.
- **Kendi promptunla AI düzenleme:** Gemini, Claude ya da OpenAI'ı seç, ne istediğini yaz ("yazım hatalarını düzelt ve başlık ekle", "madde madde özetle") ve sonucun akarak gelmesini izle. Sık kullandığın promptları kaydedebilirsin.
- **Dışa aktarma:** Yazı tipleri gömülü PDF ve Word (Türkçe, Kiril, Arapça, Çince ve Japonca karakterler doğru çıkar), düz metin ya da zaman damgalı SRT altyazı.
- **10 arayüz dili:** Türkçe, İngilizce, İspanyolca, Portekizce, Fransızca, Almanca, Rusça, Arapça, Çince ve Japonca.

## Gereksinimler

- Apple Silicon işlemcili bir Mac (M1 ve sonrası)
- Yaklaşık 5 GB boş disk alanı
- Kurulum sırasında internet bağlantısı (konuşma modelini indirmek için)
- İsteğe bağlı: AI düzenleme için Google (Gemini), Anthropic (Claude) ya da OpenAI API anahtarı

## Kurulum

1. Bu depoyu indir ya da klonla.

   git ile:

   ```bash
   git clone https://github.com/muratbulusx/local-transcribe.git
   ```

2. **`Kurulum.command`** dosyasına çift tıkla. Bir Terminal penceresi açılır ve gereken her şeyi kurar: ffmpeg, Python, paketler ve DeepFilterNet.
3. Mac'inin belleğine göre bir konuşma modeli önerir. Kabul etmek için Enter'a bas ya da başka birini seç.

macOS dosyanın doğrulanmamış bir geliştiriciden geldiğini söylerse dosyaya sağ tıklayıp **Aç**'ı seç.
İstersen bunun yerine Terminal'de `./install.sh` da çalıştırabilirsin.

## Uygulamayı başlatma

**`Baslat.command`** dosyasına çift tıkla. Uygulama tarayıcında `http://127.0.0.1:8765` adresinde açılır.
O Terminal penceresini kapatınca uygulama da kapanır.

## Nasıl çalışır

| Adım | Araç | Nerede çalışır |
|---|---|---|
| Gürültü ve hışırtı temizleme | DeepFilterNet (yoksa ffmpeg `afftdn`) | Mac'inde |
| Ses hazırlama, seviye dengeleme | ffmpeg (`dynaudnorm`) | Mac'inde |
| Sessizlik ayıklama | Silero VAD | Mac'inde |
| Konuşmayı metne çevirme | Whisper (MLX, Apple GPU) | Mac'inde |
| AI ile düzenleme (isteğe bağlı) | Gemini / Claude / OpenAI | Sağlayıcının sunucularında, kendi API anahtarınla |

## Konuşma modelleri

| Model | Boyut | En uygun olduğu durum |
|---|---|---|
| large-v3 | ~3 GB | En yüksek doğruluk (16 GB ve üstü Mac'ler için önerilir) |
| large-v3-turbo | ~1,6 GB | Daha hızlı, biraz daha az doğru |
| medium | ~1,5 GB | Belleği az olan Mac'ler |

Modeli sonradan Ayarlar'dan değiştirebilirsin. Yeni model ilk seçtiğinde iner.

## Gizlilik

- Çeviri tamamen yereldir. Ses ve video dosyaları hiçbir yere yüklenmez.
- Sadece AI düzenleme adımı metin gönderir, o da yalnızca seçtiğin sağlayıcıya.
- API anahtarları macOS Anahtar Zinciri'nde saklanır. Geri kalan her şey (ayarlar, konuşma modelleri, Python, yazı tipleri) uygulama klasöründeki `data/` klasöründe durur; klasörü silmek hepsini kaldırır.
- Ücretsiz katmanlarda yapay zeka sağlayıcıları gönderilen metni ürünlerini geliştirmek için kullanabilir. Gizli içeriklerde bunu aklında tut.

## Sorun giderme

- **"8765 portu başka bir program tarafından kullanılıyor":** O portu başka bir uygulama kullanıyor. Farklı bir port için `SES_CEVIRME_PORT=8766 ./Baslat.command` çalıştır. (Ses Çevirme zaten açıksa `Baslat.command`'a tekrar çift tıklamak sadece tarayıcıyı açar.)
- **Anahtar testi "reddedildi" diyor:** Anahtar kopyalanırken eksik kalmış olabilir. Tekrar yapıştır.
- **Kelimeler yanlış duyuluyor:** Daha büyük bir model dene, otomatik algılama yerine çeviri dilini sabitle ve terimleri bağlama göre düzeltmek için AI düzenlemeyi kullan.

## Lisans

MIT. Ayrıntılar için [LICENSE](../LICENSE).
