# Local Transcribe

[English](../README.md) · [Türkçe](README.tr.md) · [Español](README.es.md) · [Português](README.pt.md) · **Français** · [Deutsch](README.de.md) · [Русский](README.ru.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

Transformez vos enregistrements de cours et de tutoriels en texte directement sur votre Mac, sans envoyer l’audio où que ce soit.
La transcription s’affiche ligne par ligne sous vos yeux. Si vous le souhaitez, vous pouvez ensuite la faire retravailler par Gemini, Claude ou
OpenAI avec votre propre prompt, puis la télécharger en PDF, Word, TXT ou sous-titres SRT.

> **Pour l'instant, macOS uniquement.** Local Transcribe fonctionne sur les Mac Apple Silicon (M1 ou ultérieur). Windows et Linux ne sont pas encore pris en charge. La section « Windows et Linux » ci-dessous indique ce qu'il faudrait pour les prendre en charge.

## Fonctionnalités

- **Transcription en direct :** déposez un fichier audio ou vidéo et le texte s’affiche au fur et à mesure, avec les horodatages.
- **Efficace sur les enregistrements difficiles :** réduction du bruit par IA (DeepFilterNet), égalisation du volume pour les orateurs peu audibles et saut des silences pour que le modèle n’invente pas de phrases.
- **Fonctionne en local :** la reconnaissance vocale utilise Whisper sur le GPU du Mac (Apple MLX). Votre audio ne quitte jamais votre ordinateur.
- **Édition IA avec votre propre prompt :** choisissez Gemini, Claude ou OpenAI, écrivez ce que vous voulez (« corrige l’orthographe et ajoute des titres », « résume sous forme de liste à puces ») et regardez le résultat s’afficher en direct. Enregistrez les prompts que vous utilisez souvent.
- **Exportation :** PDF et Word avec polices intégrées (les textes en turc, en cyrillique, en arabe, en chinois et en japonais s’impriment tous correctement), texte brut ou sous-titres SRT minutés.
- **10 langues d’interface :** turc, anglais, espagnol, portugais, français, allemand, russe, arabe, chinois et japonais.

## Configuration requise

- Un Mac avec puce Apple (M1 ou ultérieur)
- Environ 6 Go d’espace disque disponible
- Une connexion Internet pendant l’installation (pour télécharger le modèle vocal)
- Facultatif : une clé API de Google (Gemini), d’Anthropic (Claude) ou d’OpenAI pour l’édition IA

## Installation

1. Téléchargez ou clonez ce dépôt.

   Avec git :

   ```bash
   git clone https://github.com/muratbulusx/local-transcribe.git
   ```

2. Double-cliquez sur **`Kurulum.command`** (« Installation »). Une fenêtre Terminal s’ouvre et installe tout le nécessaire : ffmpeg, Python, les paquets et DeepFilterNet.
3. Un modèle vocal vous est proposé en fonction de la mémoire de votre Mac. Appuyez sur Entrée pour l’accepter ou choisissez-en un autre.

Si macOS indique que le fichier provient d’un développeur non identifié, faites un clic droit dessus et choisissez **Ouvrir**.
Vous pouvez aussi exécuter `./install.sh` dans Terminal.

## Lancer l’app

Double-cliquez sur **`Baslat.command`** (« Lancer »). L’app s’ouvre dans votre navigateur à l’adresse `http://127.0.0.1:8765`.
Fermer cette fenêtre Terminal arrête l’app.

## Fonctionnement

| Étape | Outil | Où elle s’exécute |
|---|---|---|
| Suppression du bruit et du souffle | DeepFilterNet (sinon ffmpeg `afftdn`) | Votre Mac |
| Préparation de l’audio, égalisation du volume | ffmpeg (`dynaudnorm`) | Votre Mac |
| Saut des silences | Silero VAD | Votre Mac |
| Parole en texte | Whisper (MLX, GPU Apple) | Votre Mac |
| Édition IA (facultative) | Gemini / Claude / OpenAI | Les serveurs du fournisseur, avec votre propre clé API |

## Modèles vocaux

| Modèle | Taille | Idéal pour |
|---|---|---|
| large-v3 | ~3 Go | Précision maximale (recommandé pour les Mac de 16 Go et plus) |
| large-v3-turbo | ~1,6 Go | Plus rapide, un peu moins précis |
| medium | ~1,5 Go | Mac avec moins de mémoire |

Vous pouvez changer de modèle plus tard dans les Réglages. Le nouveau modèle est téléchargé la première fois que vous le sélectionnez.

## Confidentialité

- La transcription est entièrement locale. Les fichiers audio et vidéo ne sont jamais envoyés.
- Seule l’étape d’édition IA envoie du texte, et uniquement au fournisseur que vous choisissez.
- Les clés API sont stockées dans le trousseau macOS. Tout le reste (réglages, modèles vocaux, Python, polices) se trouve dans le dossier `data/` du dossier de l'app : supprimer le dossier efface tout.
- Avec les offres gratuites, les fournisseurs d'IA peuvent utiliser le texte envoyé pour améliorer leurs produits. Gardez-le en tête pour les contenus confidentiels.

## Dépannage

- **"Port 8765 is in use by another program" :** une autre app utilise ce port. Exécutez `LOCAL_TRANSCRIBE_PORT=8766 ./Baslat.command` pour en utiliser un autre. (Si Local Transcribe est déjà en cours d’exécution, un nouveau double-clic sur `Baslat.command` ouvre simplement le navigateur.)
- **Le test de la clé indique « refusée » :** la clé a probablement été tronquée lors de la copie. Collez-la à nouveau.
- **Des mots sont mal reconnus :** essayez un modèle plus grand, indiquez la langue de transcription au lieu de la détection automatique et utilisez l’édition IA pour corriger les termes d’après le contexte.

## Windows et Linux

Pour l'instant, l'app ne fonctionne que sur macOS avec Apple Silicon. L'essentiel (l'interface web, le serveur, la détection des silences, l'édition IA et l'export) est déjà multiplateforme. Ces parties dépendent du Mac et devraient changer :

| Partie | Actuellement (macOS) | Nécessaire pour Windows / Linux |
|---|---|---|
| Reconnaissance vocale | `mlx-whisper`, qui ne tourne que sur le GPU Apple | `faster-whisper` (GPU NVIDIA avec CUDA, ou CPU) ou `whisper.cpp` (Vulkan pour les GPU AMD et Intel). Ils utilisent un autre format de modèle : la liste des modèles et le téléchargeur ont besoin d'un second jeu de modèles. |
| Paquets Python | `mlx-whisper` est installé sur tous les systèmes | Des marqueurs de plateforme dans `pyproject.toml` pour que chaque système reçoive le bon moteur vocal |
| Installation et lancement | `Kurulum.command`, `Baslat.command`, `install.sh` (bash, commandes macOS) | Des scripts `.bat`/PowerShell pour Windows et `.sh` pour Linux qui font les mêmes étapes avec `uv` |
| ffmpeg | Installé avec Homebrew | `winget` ou un ffmpeg fourni sous Windows ; `apt`/`dnf` sous Linux |
| DeepFilterNet | Binaire Apple Silicon | La même version publie aussi des binaires Windows et Linux ; l'installateur doit télécharger le bon |
| Stockage des clés API | Trousseau macOS | Gestionnaire d'identification Windows et Secret Service sous Linux (`keyring` gère déjà les deux), plus une solution de repli pour les Linux sans trousseau |
| Vérifications du système | `sysctl` (mémoire, puce) et `defaults` (langue) | La méthode propre à chaque système pour lire la mémoire, le GPU et la langue |

- Sans GPU NVIDIA, large-v3 tourne sur le CPU et devient plusieurs fois plus lent. `large-v3-turbo` ou `medium` serait alors un meilleur choix par défaut.
- Chaque plateforme doit être testée sur du vrai matériel.

Les contributions sont les bienvenues : ouvrez une issue ou une pull request.

## Licence

MIT. Voir [LICENSE](../LICENSE).
