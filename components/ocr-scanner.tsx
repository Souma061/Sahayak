"use client";

import { Globe, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import { CropperRef } from "react-advanced-cropper";
import TranslationHistory from "./translation-history";

// Hooks
import { useCamera } from "@/hooks/use-camera";
import { useOCR } from "@/hooks/use-ocr";
import { useTranslation } from "@/hooks/use-translation";
import { useVoiceInput } from "@/hooks/use-voice-input";

// Components
import CameraView from "@/components/scanner/camera-view";
import ControlPanel from "@/components/scanner/control-panel";
import ResultCard from "@/components/scanner/result-card";

const languages = [
  { code: "hi", label: "Hindi (हिंदी)", voice: "hi-IN" },
  { code: "bn", label: "Bengali (বাংলা)", voice: "bn-IN" },
  { code: "ta", label: "Tamil (தமிழ்)", voice: "ta-IN" },
  { code: "te", label: "Telugu (తెలుగు)", voice: "te-IN" },
  { code: "kn", label: "Kannada (कन्नड़)", voice: "kn-IN" },
  { code: "ml", label: "Malayalam (मलयालम)", voice: "ml-IN" },
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
  const cropperRef = useRef<CropperRef>(null);

  // --- State ---
  const [targetLang, setTargetLang] = useState("hi");
  const [sourceLang, setSourceLang] = useState("eng");
  const [showHistory, setShowHistory] = useState(false);

  // --- Hooks ---
  const {
    webcamRef,
    fileInputRef,
    imageSrc,
    setImageSrc,
    capture,
    handleFileUpload,
    resetCamera,
    triggerFileUpload,
  } = useCamera();

  const {
    ocrText,
    setOcrText,
    isProcessing,
    debugImage,
    processImage,
    clearOCR,
  } = useOCR({ cropperRef, sourceLang });

  const { isListening, startVoiceInput } = useVoiceInput({
    onTranscript: (text) => setOcrText(text),
    lang: "en-US", // Ideally dynamic based on sourceLang, handled in hook logic or passed here
  });

  const {
    translatedText,
    setTranslatedText,
    isTranslating,
    translate,
    history,
    deleteFromHistory,
  } = useTranslation();

  // --- Handlers ---
  const handleRetake = () => {
    resetCamera();
    clearOCR();
    setTranslatedText("");
  };

  const handleTranslate = () => {
    translate(ocrText, targetLang);
  };

  const handleHistorySelect = (original: string, translated: string) => {
    setOcrText(original);
    setTranslatedText(translated);
    setImageSrc(null); // Optional: clear image when loading history
  };

  return (
    <div className="w-full max-w-lg md:max-w-6xl mx-auto mt-6 transition-all duration-500">
      <div className="flex md:hidden justify-end mb-4 px-4">
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded-full"
        >
          <RefreshCw size={12} /> History
        </button>
      </div>

      <TranslationHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        onSelect={handleHistorySelect}
        onDelete={deleteFromHistory}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start px-4 md:px-0">
        <div className="flex flex-col">
          <CameraView
            imageSrc={imageSrc}
            webcamRef={webcamRef}
            cropperRef={cropperRef}
            debugImage={debugImage}
          />

          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/*"
            onChange={handleFileUpload}
          />

          <ControlPanel
            imageSrc={imageSrc}
            isListening={isListening}
            isProcessing={isProcessing}
            sourceLang={sourceLang}
            setSourceLang={setSourceLang}
            onUploadTrigger={triggerFileUpload}
            onCapture={capture}
            onVoiceStart={startVoiceInput}
            onRetake={handleRetake}
            onRotate={() => cropperRef.current?.rotateImage(90)}
            onProcess={processImage}
            ocrLanguages={ocrLanguages}
          />
        </div>

        <div className="flex flex-col gap-6 md:h-full">
          <div className="hidden md:flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="text-violet-400" />
              Translation Studio
            </h2>
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all"
            >
              <RefreshCw size={16} /> History
            </button>
          </div>

          <ResultCard
            ocrText={ocrText}
            translatedText={translatedText}
            isTranslating={isTranslating}
            isListening={isListening}
            targetLang={targetLang}
            setTargetLang={setTargetLang}
            setTranslatedText={setTranslatedText}
            onTranslate={handleTranslate}
            onVoiceStart={startVoiceInput}
            languages={languages}
          />
        </div>
      </div>
    </div>
  );
}
