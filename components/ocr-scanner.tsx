"use client";

import {
  Camera,
  Check,
  Globe,
  RefreshCw,
  RotateCw,
  Upload,
  Volume2,
} from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Cropper, CropperRef } from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";
import Webcam from "react-webcam";
import Tesseract from "tesseract.js";

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

  // Load cache from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ocr-translation-cache");
      if (saved) {
        translationCache.current = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load translation cache", e);
    }
  }, []);

  const saveToCache = (text: string, translation: string) => {
    translationCache.current[text] = translation;
    try {
      localStorage.setItem(
        "ocr-translation-cache",
        JSON.stringify(translationCache.current),
      );
    } catch (e) {
      console.error("Failed to save translation cache", e);
    }
  };

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hasHindiVoice, setHasHindiVoice] = useState(false);

  useEffect(() => {
    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      const hindiAvailable = availableVoices.some(
        (v) => v.lang === "hi-IN" || v.name.toLowerCase().includes("hindi"),
      );
      setHasHindiVoice(hindiAvailable);
    };

    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    updateVoices();

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speakText = (text: string) => {
    if (!text) return;
    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance; // Prevent garbage collection

    // Attempt to find a preferred Hindi voice
    const hindiVoice =
      voices.find((v) => v.lang === "hi-IN") ||
      voices.find((v) => v.name.toLowerCase().includes("hindi"));

    if (hindiVoice) {
      utterance.voice = hindiVoice;
      utterance.lang = hindiVoice.lang;
    } else {
      utterance.lang = "hi-IN";
    }

    utterance.rate = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      // Log the specific error string (e.g., 'not-allowed', 'language-unavailable')
      console.error("Speech synthesis error:", e.error);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const initWorker = async () => {
      workerRef.current = await Tesseract.createWorker("eng");
    };
    initWorker();

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

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
        body: JSON.stringify({ text: ocrText, targetLang: "hi" }),
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

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full max-w-md mx-auto">
      <div className="relative w-full aspect-[3/4] bg-black rounded-xl overflow-hidden border-2 border-gray-800 shadow-2xl">
        {!imageSrc ? (
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/png"
            className="w-full h-full object-cover"
            videoConstraints={{ facingMode: "environment" }}
          />
        ) : (
          <Cropper
            ref={cropperRef}
            src={imageSrc}
            stencilProps={{ grid: true }}
            backgroundClassName="bg-black"
          />
        )}
      </div>

      {debugImage && (
        <div className="w-full p-2 border border-yellow-400 rounded bg-yellow-50 text-xs">
          <p>OCR Input Preview</p>
          <img src={debugImage} className="h-20 mt-1 border" alt="OCR Debug" />
        </div>
      )}

      {!imageSrc ? (
        <div className="flex gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-700 p-4 rounded-full text-white"
          >
            <Upload />
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
            className="bg-green-600 p-4 rounded-full text-white"
          >
            <Camera size={32} />
          </button>
        </div>
      ) : (
        <div className="flex gap-3 w-full">
          <button
            onClick={() => {
              setImageSrc(null);
              resetResults();
            }}
            className="px-4 py-3 bg-gray-700 text-white rounded-lg"
          >
            <RefreshCw size={18} /> Retake
          </button>

          <button
            onClick={() => cropperRef.current?.rotateImage(90)}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg"
          >
            <RotateCw size={18} /> Rotate
          </button>

          <button
            onClick={processImage}
            disabled={isProcessing}
            className="flex-1 bg-green-600 text-white rounded-lg font-bold"
          >
            {isProcessing ? (
              "Reading..."
            ) : (
              <>
                <Check /> Read
              </>
            )}
          </button>
        </div>
      )}

      {ocrText && (
        <div className="w-full flex flex-col gap-4">
          <div className="p-4 bg-gray-50 border rounded">
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">
              Detected Text
            </h3>
            <p className="whitespace-pre-wrap">{ocrText}</p>
          </div>

          <button
            onClick={translateText}
            disabled={isTranslating}
            className="bg-blue-600 text-white py-4 rounded-xl font-bold"
          >
            {isTranslating ? (
              "Translating..."
            ) : (
              <>
                <Globe /> Translate to Hindi
              </>
            )}
          </button>

          {translatedText && (
            <div className="p-4 bg-blue-50 border rounded">
              <h3 className="text-xs font-bold uppercase text-blue-600 mb-2">
                Hindi Translation
              </h3>
              <p className="whitespace-pre-wrap">{translatedText}</p>
              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => speakText(translatedText)}
                  className={`p-3 rounded-full shadow-sm w-fit transition-all ${
                    isSpeaking
                      ? "bg-orange-500 text-white animate-pulse"
                      : "bg-white text-blue-600 hover:bg-blue-100"
                  }`}
                  title="Listen"
                >
                  <Volume2 size={24} />
                </button>
                {!hasHindiVoice && (
                  <p className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
                    ⚠️ Hindi voice not found on this device. You may need to
                    install the Hindi language pack in your OS settings or use a
                    different browser.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
