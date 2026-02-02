# Sahayak (सहायक) 🇮🇳

**Sahayak** ("Helper") is an AI-powered Progressive Web App (PWA) designed to bridge language barriers. It combines optical character recognition (OCR), voice input, and instant translation to help users easier understand and communicate in multiple Indian languages.

![Sahayak Preview](https://placehold.co/1200x600/0f172a/ffffff?text=Sahayak+Interface+Preview)

## 🚀 Features

- **📸 Smart OCR Scanner**: Instantly extract text from images using your camera or by uploading files. Powered by **Tesseract.js**.
- **🗣️ Voice Input**: Speak to translate! Supports generic voice input for English and Indian languages using the Web Speech API.
- **🌏 Multi-Language Support**: Seamless translation between English, Hindi, Bengali, Tamil, Telugu, Kannada, and Malayalam.
- **🖼️ Viral Share Cards**: Don't just copy text—share beautiful, generated image cards of your translations directly to WhatsApp or social media.
- **🔊 Text-to-Speech**: Listen to the translated text with natural-sounding pronunciation.
- **💾 Smart History**: Automatically caches translations for offline access and quick retrieval.
- **📱 Installable PWA**: Works offline and installs like a native app on Android, iOS, and Desktop.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Directory)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **OCR Engine**: [Tesseract.js](https://tesseract.projectnaptha.com/)
- **Image Generation**: `html-to-image`
- **PWA**: `next-pwa`

## 📦 Getting Started

1.  **Clone the repository**

    ```bash
    git clone https://github.com/yourusername/sahayak.git
    cd sahayak
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Set up Environment Variables**
    Create a `.env` file in the root directory (if required for API keys):

    ```env
    # Add any necessary API keys here
    ```

4.  **Run the development server**

    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Uses

- **Travelers**: Translate signs and menus instantly.
- **Students**: Quickly digitize and translate study notes.
- **Elderly & Digital Novices**: Use voice commands instead of typing.
- **Migrant Workers**: Communicate effectively in local languages.

## ❤️ Special Thanks

Special thanks to [lingo.dev](https://www.lingo.dev/) for their incredible support and infrastructure that makes building AI-powered language applications easier.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
