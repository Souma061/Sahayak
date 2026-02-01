"use client";

import {
  Camera,
  Check,
  Copy,
  Globe,
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
import Tesseract from "tesseract.js";
import TranslationHistory from "./translation-history";

const languages = [
  { code: "hi", label: "Hindi (हिंदी)", voice: "hi-IN" },
  { code: "bn", label: "Bengali (বাংলা)", voice: "bn-IN" },
  { code: "ta", label: "Tamil (தமிழ்)", voice: "ta-IN" },
  { code: "te", label: "Telugu (తెలుగు)", voice: "te-IN" },
  { code: "en", label: "English", voice: "en-US" },
];

export default function SmartScanner() {
  const webcamRef = useRef<Webcam>(null);
  const cropperRef = useRef<CropperRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const workerRef = useRef<Tesseract.Worker | null>(null);

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

    //find the target language voice
    const targetVoiceCode = languages.find((l) => l.code === targetLang)?.voice;

    // find a matching voice in the browser(if any)
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

  const [sourceLang, setSourceLang] = useState("eng");

  useEffect(() => {
    const initWorker = async () => {
      // Re-initialize worker when source language changes
      if (workerRef.current) {
        await workerRef.current.terminate();
      }

      // Tesseract language codes
      // English: eng, Hindi: hin, Bengali: ben, Tamil: tam, Telugu: tel
      const langMap: Record<string, string> = {
        en: "eng",
        hi: "hin",
        bn: "ben",
        ta: "tam",
        te: "tel",
      };

      const tesseractLang = langMap[sourceLang] || "eng";
      workerRef.current = await Tesseract.createWorker(tesseractLang);
    };
    initWorker();

    return () => {
      workerRef.current?.terminate();
    };
  }, [sourceLang]);

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
    if (!cropperRef.current || !workerRef.current) return;

    setIsProcessing(true);
    setOcrText("Scanning...");

    try {
      const canvas = cropperRef.current.getCanvas();
      if (!canvas) return;

      const image = canvas.toDataURL("image/png");
      setDebugImage(image);

      const result = await workerRef.current.recognize(image);
      const text = result.data.text.trim();

      setOcrText(
        text.length > 0
          ? text
          : "No text detected. Try better lighting or tighter crop.",
      );
    } catch (err) {
      console.error(err);
      setOcrText("Failed to read text.");
    } finally {
      setIsProcessing(false);
    }
  };

  const translateText = async () => {
    if (!ocrText) return;

    // Check cache first (memory)
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

      // Update cache on success (Memory + LocalStorage)
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

  // Unused state removed: voices, hasHindiVoice

  return (
    <div className="w-full max-w-lg md:max-w-6xl mx-auto mt-6 transition-all duration-500">
      {/* Mobile-only Header for History (Desktop has it in the right column) */}
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

      {/* Source Language Selector */}
      <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10 w-full max-w-xs">
        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest pl-2">
          Tap to Scan:
        </span>
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="bg-transparent text-sm font-bold text-white outline-none flex-1 cursor-pointer [&>option]:text-black"
        >
          <option value="en">English Document</option>
          <option value="hi">Hindi (हिंदी)</option>
          <option value="bn">Bengali (বাংলা)</option>
          <option value="ta">Tamil (தமிழ்)</option>
          <option value="te">Telugu (తెలుగు)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start px-4 md:px-0">
        {/* LEFT COLUMN: Camera & Input Controls */}
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
                {/* Scanner Overlay */}
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

          {/* Control Area */}
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
              <div className="w-[72px] opacity-0"></div>{" "}
              {/* Spacer for symmetry */}
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

        {/* RIGHT COLUMN: Results & History */}
        <div className="flex flex-col gap-6 md:h-full">
          {/* Desktop Header with History */}
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

          {/* Empty State for Desktop */}
          {!ocrText && (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center p-12 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Camera className="text-gray-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-300 mb-2">
                Ready to Scan
              </h3>
              <p className="text-gray-500 max-w-xs">
                Capture an image or upload a file to extract text and translate
                it instantly.
              </p>
            </div>
          )}

          {ocrText && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom duration-500">
              {/* Detected Text Card */}
              <div className="p-5 bg-black/20 border border-white/10 rounded-2xl shadow-inner relative group">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Detected Text
                </h3>
                <p className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed font-light max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {ocrText}
                </p>
              </div>

              {/* Language Selector */}
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
                    Translate Now
                  </>
                )}
              </button>

              {translatedText && (
                <div className="group relative p-6 bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 rounded-2xl shadow-xl transition-all duration-300 hover:border-blue-500/40">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    Translation (
                    {languages.find((l) => l.code === targetLang)?.label})
                  </h3>

                  <p className="whitespace-pre-wrap text-blue-100 text-lg font-light leading-relaxed mb-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {translatedText}
                  </p>

                  {/* Floating Action Bar */}
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <button
                      onClick={() => copyToClipboard(translatedText)}
                      className="p-2.5 rounded-full bg-slate-900/50 text-gray-400 hover:text-white hover:bg-blue-600 border border-white/10 backdrop-blur-md transition-all"
                      title="Copy"
                    >
                      <Copy size={16} />
                    </button>

                    <button
                      onClick={() => shareText(translatedText)}
                      className="p-2.5 rounded-full bg-slate-900/50 text-gray-400 hover:text-white hover:bg-violet-600 border border-white/10 backdrop-blur-md transition-all"
                      title="Share"
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
