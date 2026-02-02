"use client";

import { toPng } from "html-to-image";
import {
  Camera,
  Check,
  Copy,
  Globe,
  Image as ImageIcon,
  Mic,
  RefreshCw,
  RotateCw,
  Share2,
  Upload,
  Volume2,
} from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Cropper, CropperRef } from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";
import Webcam from "react-webcam";
import TranslationHistory from "./translation-history";

interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface WindowWithSpeech extends Window {
  webkitSpeechRecognition: new () => SpeechRecognition;
  SpeechRecognition: new () => SpeechRecognition;
}

const languages = [
  { code: "hi", label: "Hindi (हिंदी)", voice: "hi-IN" },
  { code: "bn", label: "Bengali (বাংলা)", voice: "bn-IN" },
  { code: "ta", label: "Tamil (தமிழ்)", voice: "ta-IN" },
  { code: "te", label: "Telugu (తెలుగు)", voice: "te-IN" },
  { code: "kan", label: "Kannada (कन्नड़)", voice: "kn-IN" },
  { code: "mal", label: "Malayalam (मलयालम)", voice: "ml-IN" },
  { code: "en", label: "English", voice: "en-US" },
];

const ocrLanguages = [
  { code: "eng", label: "English" },
  { code: "hin", label: "Hindi (हिंदी)" },
  { code: "ben", label: "Bengali (বাংলা)" },
  { code: "tam", label: "Tamil (தமிழ்)" },
  { code: "tel", label: "Telugu (తెలుగు)" },
  { code: "kan", label: "Kannada (कन्नड़)" },
  { code: "mal", label: "Malayalam (मलयालम)" },
];

export default function SmartScanner() {
  const webcamRef = useRef<Webcam>(null);
  const cropperRef = useRef<CropperRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cache ref backed by localStorage
  const translationCache = useRef<Record<string, string>>({});

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [debugImage, setDebugImage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [targetLang, setTargetLang] = useState("hi");
  const [sourceLang, setSourceLang] = useState("eng");

  const [isListening, setIsListening] = useState(false); // Voice Input State

  // State for UI rendering of history
  const [history, setHistory] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);

  // Load cache from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ocr-translation-cache");
      if (saved) {
        const parsed = JSON.parse(saved);
        translationCache.current = parsed;
        setHistory(parsed);
      }
    } catch (e) {
      console.error("Failed to load translation cache", e);
    }
  }, []);

  const saveToCache = (text: string, translation: string) => {
    translationCache.current[text] = translation;
    setHistory({ ...translationCache.current }); // Update UI state
    try {
      localStorage.setItem(
        "ocr-translation-cache",
        JSON.stringify(translationCache.current),
      );
    } catch (e) {
      console.error("Failed to save translation cache", e);
    }
  };

  const deleteFromHistory = (text: string) => {
    const newCache = { ...translationCache.current };
    delete newCache[text];

    translationCache.current = newCache;
    setHistory(newCache);

    try {
      localStorage.setItem("ocr-translation-cache", JSON.stringify(newCache));
    } catch (e) {
      console.error("Failed to update cache", e);
    }
  };

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speakText = (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();

    const uttrance = new SpeechSynthesisUtterance(text);

    // dynamic voice selection
    const voices = window.speechSynthesis.getVoices();

    const targetVoiceCode = languages.find((l) => l.code === targetLang)?.voice;
    const matchingVoice = voices.find((v) =>
      v.lang.includes(targetVoiceCode || ""),
    );

    if (matchingVoice) {
      uttrance.voice = matchingVoice;
    }
    uttrance.lang = targetVoiceCode || "hi-IN";
    uttrance.rate = 0.9;

    uttrance.onstart = () => setIsSpeaking(true);
    uttrance.onend = () => setIsSpeaking(false);
    uttrance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = uttrance;
    window.speechSynthesis.speak(uttrance);
  };

  const capture = () => {
    const image = webcamRef.current?.getScreenshot();
    if (!image) return;

    setImageSrc(image);
    resetResults();
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      resetResults();
    };
    reader.readAsDataURL(file);
  };

  const processImage = async () => {
    if (!cropperRef.current) return;

    setIsProcessing(true);
    setOcrText(
      `Scanning (${ocrLanguages.find((l) => l.code === sourceLang)?.label})...`,
    );

    try {
      const canvas = cropperRef.current.getCanvas();
      if (!canvas) return;

      const image = canvas.toDataURL("image/png");
      setDebugImage(image);

      const Tesseract = (await import("tesseract.js")).default;

      const {
        data: { text },
      } = await Tesseract.recognize(image, sourceLang, {
        logger: (m) => console.log(m),
      });

      const cleanedText = text?.trim();
      setOcrText(
        cleanedText && cleanedText.length > 0
          ? cleanedText
          : "No text detected.",
      );
    } catch (err) {
      console.error(err);
      setOcrText("Failed to read text. Please check the image and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const translateText = async () => {
    if (!ocrText) return;

    if (translationCache.current[ocrText]) {
      setTranslatedText(translationCache.current[ocrText]);
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ocrText, targetLang }),
      });

      const data = await res.json();
      const translated = data.translatedText || "Translation failed.";

      setTranslatedText(translated);

      if (data.translatedText) {
        saveToCache(ocrText, translated);
      }
    } catch {
      setTranslatedText("Failed to translate.");
    } finally {
      setIsTranslating(false);
    }
  };

  const resetResults = () => {
    setOcrText("");
    setTranslatedText("");
    setDebugImage(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const shareText = (text: string) => {
    if (navigator.share) {
      navigator
        .share({
          title: "Sahayak Translation",
          text: text,
        })
        .catch(console.error);
    } else {
      copyToClipboard(text);
    }
  };

  const shareAsImage = async () => {
    const element = document.getElementById("translation-card");
    if (!element) return;

    try {
      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: "#0f172a", // Slate-900 background for better visibility on all themes
        filter: (node) => !node.classList?.contains("exclude-from-share"),
        style: {
          borderRadius: "16px", // Ensure rounded corners in captured image
        },
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "sahayak-translation.png", {
        type: "image/png",
      });

      if (navigator.share) {
        // Try sharing the file provided the browser supports it
        try {
          await navigator.share({
            files: [file],
            title: "Sahayak Translation",
            text: "Check out this translation from Sahayak!",
          });
        } catch (shareError) {
          console.log(
            "Share failed or cancelled, falling back to download",
            shareError,
          );
          // If share fails (e.g. user cancels or unsupported on specific platform despite navigator.share existing), fallback to download
          const link = document.createElement("a");
          link.download = "sahayak-translation.png";
          link.href = dataUrl;
          link.click();
        }
      } else {
        const link = document.createElement("a");
        link.download = "sahayak-translation.png";
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Failed to share image", err);
      alert("Failed to create image.");
    }
  };

  // Voice Input Logic
  const startVoiceInput = () => {
    const win = window as unknown as WindowWithSpeech;

    if (!win.webkitSpeechRecognition && !win.SpeechRecognition) {
      alert(
        "Voice input is not supported in this browser. Please use Chrome or Edge.",
      );
      return;
    }

    const SpeechRecognition =
      win.SpeechRecognition || win.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    const langMap: Record<string, string> = {
      eng: "en-US",
      hin: "hi-IN",
      ben: "bn-IN",
      tam: "ta-IN",
      tel: "te-IN",
      kan: "kn-IN",
      mal: "ml-IN",
    };

    // Default to 'en-US' if mapping fails
    recognition.lang = langMap[sourceLang] || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setOcrText("Listening..."); // Clear/Show listening state in the box immediately

    try {
      recognition.start();
    } catch (e) {
      console.error("Recognition start error:", e);
      setIsListening(false);
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const speechResult = event.results[0][0].transcript;
      setOcrText(speechResult); // Overwrite directly for "Voice Mode"
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);

      if (event.error === "network") {
        alert(
          "Voice input failed. If you are online, your browser (like Brave) might be blocking Google's Speech Service. Please try using Chrome or Edge.",
        );
      } else if (event.error === "not-allowed") {
        alert("Microphone access denied. Please allow microphone permissions.");
      } else if (event.error === "no-speech") {
        setOcrText(""); // Clear if nothing heard
      } else {
        alert(`Voice input error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  return (
    <div className="w-full max-w-lg md:max-w-6xl mx-auto mt-6 transition-all duration-500">
      <div className="flex md:hidden justify-end mb-4 px-4">
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-full"
        >
          <RefreshCw size={12} /> History
        </button>
      </div>

      <TranslationHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        onSelect={(original, translated) => {
          setOcrText(original);
          setTranslatedText(translated);
          setImageSrc(null);
        }}
        onDelete={deleteFromHistory}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start px-4 md:px-0">
        <div className="flex flex-col gap-6 bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-6">
          <div className="relative w-full aspect-[3/4] md:aspect-video bg-black/40 rounded-2xl overflow-hidden border-2 border-white/10 shadow-inner group">
            {!imageSrc ? (
              <>
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/png"
                  forceScreenshotSourceSize={true}
                  className="w-full h-full object-cover opacity-80"
                  videoConstraints={{
                    facingMode: "environment",
                    width: 1280,
                    height: 720,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent pointer-events-none animate-scan opacity-50" />
                <div className="absolute inset-0 border-2 border-white/20 rounded-2xl pointer-events-none" />
              </>
            ) : (
              <Cropper
                ref={cropperRef}
                src={imageSrc}
                stencilProps={{
                  grid: true,
                  lines: true,
                  handlers: {
                    eastSouth: true,
                    westNorth: true,
                    westSouth: true,
                    eastNorth: true,
                  },
                }}
                backgroundClassName="bg-black/90"
                className="rounded-2xl"
              />
            )}
          </div>

          {debugImage && (
            <div className="w-full p-3 border border-yellow-500/30 rounded-xl bg-yellow-500/10 text-xs text-yellow-200/80 flex items-center justify-between">
              <span>Debug Preview</span>
              <img
                src={debugImage}
                className="h-10 rounded border border-white/10"
                alt="OCR Debug"
              />
            </div>
          )}

          {!imageSrc ? (
            <div className="flex gap-6 items-center w-full justify-center py-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:bg-white/5"
              >
                <div className="p-4 rounded-full bg-white/10 group-hover:bg-blue-500 text-white transition-all shadow-lg border border-white/10 group-hover:scale-110">
                  <Upload size={24} />
                </div>
                <span className="text-xs font-medium text-gray-400 group-hover:text-white">
                  Upload
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleFileUpload}
              />

              <button
                onClick={capture}
                className="p-6 rounded-full bg-gradient-to-tr from-blue-500 to-violet-500 text-white shadow-xl shadow-blue-500/20 hover:scale-105 hover:shadow-blue-500/40 transition-all active:scale-95 border-4 border-white/10"
              >
                <Camera size={40} />
              </button>

              <button
                onClick={startVoiceInput}
                className={`group flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:bg-white/5 ${isListening ? "animate-pulse" : ""}`}
              >
                <div
                  className={`p-4 rounded-full transition-all shadow-lg border border-white/10 group-hover:scale-110 ${isListening ? "bg-red-500 text-white" : "bg-white/10 group-hover:bg-emerald-500 text-white"}`}
                >
                  <Mic size={24} />
                </div>
                <span
                  className={`text-xs font-medium group-hover:text-white ${isListening ? "text-red-400 font-bold" : "text-gray-400"}`}
                >
                  {isListening ? "Listening" : "Voice"}
                </span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => {
                  setImageSrc(null);
                  resetResults();
                }}
                className="flex items-center justify-center gap-2 px-4 py-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl font-medium transition-all border border-white/5 hover:border-white/10"
              >
                <RefreshCw size={18} /> Retake
              </button>

              <button
                onClick={() => cropperRef.current?.rotateImage(90)}
                className="flex items-center justify-center gap-2 px-4 py-4 bg-white/5 hover:bg-white/10 text-blue-300 hover:text-blue-200 rounded-xl font-medium transition-all border border-white/5 hover:border-blue-500/30"
              >
                <RotateCw size={18} /> Rotate
              </button>

              <div className="col-span-2 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                  Read In:
                </span>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-medium text-white outline-none cursor-pointer [&>option]:text-black"
                >
                  {ocrLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={processImage}
                disabled={isProcessing}
                className="col-span-2 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="animate-spin" /> Reading...
                  </>
                ) : (
                  <>
                    <Check /> Extract Text
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 md:h-full">
          <div className="hidden md:flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="text-blue-400" />
              Translation Studio
            </h2>
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all"
            >
              <RefreshCw size={16} /> History
            </button>
          </div>

          {!ocrText && (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center p-12 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Camera className="text-gray-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-300 mb-2">
                Ready to Scan or Speak
              </h3>
              <p className="text-gray-500 max-w-xs">
                Capture an image, upload a file, or use voice input to translate
                it instantly.
              </p>
            </div>
          )}

          {ocrText && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom duration-500">
              <div className="p-5 bg-black/20 border border-white/10 rounded-2xl shadow-inner relative group">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    Detected Text
                  </h3>

                  {/* Secondary Mic Button remains useful for appending text */}
                  <button
                    onClick={startVoiceInput}
                    className={`p-2 rounded-full transition-all flex items-center gap-2 ${isListening ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-white/10 text-gray-400 hover:text-white"}`}
                    title="Add text via Voice"
                  >
                    <Mic size={16} />
                  </button>
                </div>

                <p className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed font-light max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {ocrText}
                </p>
              </div>

              <div className="flex items-center gap-3 p-1 pl-4 bg-white/5 border border-white/10 rounded-xl shadow-sm">
                <Globe className="text-blue-400" size={20} />
                <select
                  value={targetLang}
                  onChange={(e) => {
                    setTargetLang(e.target.value);
                    setTranslatedText("");
                  }}
                  className="flex-1 bg-transparent font-medium text-gray-200 outline-none w-full py-3 cursor-pointer [&>option]:text-black"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      Translate to {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={translateText}
                  disabled={isTranslating}
                  className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.01] transition-all disabled:opacity-70"
                >
                  {isTranslating ? (
                    <>
                      <RefreshCw className="animate-spin" /> Translating...
                    </>
                  ) : (
                    <>
                      <Globe size={18} />
                      Translate
                    </>
                  )}
                </button>
              </div>

              {translatedText && (
                <div
                  id="translation-card"
                  className="group relative p-6 bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 rounded-2xl shadow-xl transition-all duration-300 hover:border-blue-500/40"
                >
                  <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    Translation (
                    {languages.find((l) => l.code === targetLang)?.label})
                  </h3>

                  <p className="whitespace-pre-wrap text-blue-100 text-lg font-light leading-relaxed mb-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {translatedText}
                  </p>

                  <div className="absolute bottom-3 right-3 flex gap-2 exclude-from-share">
                    <button
                      onClick={() => copyToClipboard(translatedText)}
                      className="p-2.5 rounded-full bg-slate-900/50 text-gray-400 hover:text-white hover:bg-blue-600 border border-white/10 backdrop-blur-md transition-all"
                      title="Copy Type"
                    >
                      <Copy size={16} />
                    </button>

                    <button
                      onClick={shareAsImage}
                      className="p-2.5 rounded-full bg-slate-900/50 text-emerald-400 hover:text-white hover:bg-emerald-600 border border-white/10 backdrop-blur-md transition-all"
                      title="Share Card (Viral!)"
                    >
                      <ImageIcon size={16} />
                    </button>

                    <button
                      onClick={() => shareText(translatedText)}
                      className="p-2.5 rounded-full bg-slate-900/50 text-gray-400 hover:text-white hover:bg-violet-600 border border-white/10 backdrop-blur-md transition-all"
                      title="Share Text"
                    >
                      <Share2 size={16} />
                    </button>

                    <button
                      onClick={() => speakText(translatedText)}
                      className={`p-2.5 rounded-full border border-white/10 backdrop-blur-md transition-all ${
                        isSpeaking
                          ? "bg-orange-500 text-white animate-pulse"
                          : "bg-slate-900/50 text-gray-400 hover:text-white hover:bg-emerald-600"
                      }`}
                      title="Listen"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
