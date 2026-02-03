import { toPng } from "html-to-image";
import {
  Camera,
  Copy,
  Globe,
  Image as ImageIcon,
  Mic,
  RefreshCw,
  Share2,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ResultCardProps {
  ocrText: string;
  translatedText: string;
  isTranslating: boolean;
  isListening: boolean;
  targetLang: string;
  setTargetLang: (lang: string) => void;
  setTranslatedText: (text: string) => void;
  onTranslate: () => void;
  onVoiceStart: () => void; // For the mini mic logic
  languages: { code: string; label: string; voice: string }[];
}

export default function ResultCard({
  ocrText,
  translatedText,
  isTranslating,
  isListening,
  targetLang,
  setTargetLang,
  setTranslatedText,
  onTranslate,
  onVoiceStart,
  languages,
}: ResultCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [highlightRange, setHighlightRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Track previous translated text to reset state when it changes
  const [prevTranslatedText, setPrevTranslatedText] = useState(translatedText);

  // Reset state during render if translation changes (prevents cascading renders)
  if (translatedText !== prevTranslatedText) {
    setPrevTranslatedText(translatedText);
    setIsSpeaking(false);
    setHighlightRange(null);
  }

  // Handle side effects (stopping speech)
  useEffect(() => {
    window.speechSynthesis.cancel();
  }, [translatedText]);

  const speakText = (text: string) => {
    if (!text) return;

    // Always cancel current speech before starting new
    window.speechSynthesis.cancel();
    setHighlightRange(null);

    const uttrance = new SpeechSynthesisUtterance(text);
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

    // Handle word boundaries for lighting
    uttrance.onboundary = (e) => {
      if (e.name === "word") {
        const charIndex = e.charIndex;
        // Simple fallback to find next space as word end
        const nextSpace = text.indexOf(" ", charIndex);
        const end = nextSpace === -1 ? text.length : nextSpace;
        setHighlightRange({ start: charIndex, end });
      }
    };

    uttrance.onend = () => {
      setIsSpeaking(false);
      setHighlightRange(null);
    };

    uttrance.onerror = () => {
      setIsSpeaking(false);
      setHighlightRange(null);
    };

    utteranceRef.current = uttrance;
    window.speechSynthesis.speak(uttrance);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const shareText = (text: string) => {
    if (navigator.share) {
      navigator.share({ title: "Sahayak", text }).catch(console.error);
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
        backgroundColor: "#020617",
        filter: (node) => !node.classList?.contains("exclude-from-share"),
        style: { borderRadius: "16px" },
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "sahayak-translation.png", {
        type: "image/png",
      });

      if (navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: "Sahayak Translation",
            text: "Check out this translation from Sahayak!",
          });
        } catch {
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

  const renderHighlightedText = (text: string) => {
    if (!highlightRange || !isSpeaking) return text;

    const { start, end } = highlightRange;
    // Safety check boundaries
    if (start < 0 || end > text.length || start >= end) return text;

    const before = text.substring(0, start);
    const highlighted = text.substring(start, end);
    const after = text.substring(end);

    return (
      <>
        {before}
        <span className="bg-violet-500/50 text-white rounded px-0.5 shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all duration-75">
          {highlighted}
        </span>
        {after}
      </>
    );
  };

  if (!ocrText) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center p-12 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 text-center min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <Camera className="text-zinc-500" size={32} />
        </div>
        <h3 className="text-xl font-bold text-zinc-300 mb-2">
          Ready to Scan or Speak
        </h3>
        <p className="text-zinc-500 max-w-xs">
          Capture an image, upload a file, or use voice input to translate it
          instantly.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom duration-500">
      <div className="p-5 bg-black/20 border border-white/10 rounded-2xl shadow-inner relative group">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-teal-400 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
            Detected Text
          </h3>
          <button
            onClick={onVoiceStart}
            className={`p-2 rounded-full transition-all flex items-center gap-2 ${isListening ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-white/10 text-zinc-400 hover:text-white"}`}
            title="Add text via Voice"
          >
            <Mic size={16} />
          </button>
        </div>
        <p className="whitespace-pre-wrap text-zinc-300 text-sm leading-relaxed font-light max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {ocrText}
        </p>
      </div>

      <div className="flex items-center gap-3 p-1 pl-4 bg-white/5 border border-white/10 rounded-xl shadow-sm">
        <Globe className="text-violet-400" size={20} />
        <select
          value={targetLang}
          onChange={(e) => {
            setTargetLang(e.target.value);
            setTranslatedText("");
          }}
          className="flex-1 bg-transparent font-medium text-zinc-200 outline-none w-full py-3 cursor-pointer [&>option]:text-black"
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
          onClick={onTranslate}
          disabled={isTranslating}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg shadow-violet-500/20 hover:scale-[1.01] transition-all disabled:opacity-70"
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
          className="group relative p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl shadow-xl transition-all duration-300 hover:border-violet-500/30"
        >
          <h3 className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
            Translation ({languages.find((l) => l.code === targetLang)?.label})
          </h3>

          <p className="whitespace-pre-wrap text-zinc-200 text-lg font-light leading-relaxed mb-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {renderHighlightedText(translatedText)}
          </p>

          <div className="absolute bottom-3 right-3 flex gap-2 exclude-from-share">
            <button
              onClick={() => copyToClipboard(translatedText)}
              className="p-2.5 rounded-full bg-zinc-950/50 text-zinc-400 hover:text-white hover:bg-violet-600 border border-white/10 backdrop-blur-md transition-all"
              title="Copy Type"
            >
              <Copy size={16} />
            </button>

            <button
              onClick={shareAsImage}
              className="p-2.5 rounded-full bg-zinc-950/50 text-teal-400 hover:text-white hover:bg-teal-600 border border-white/10 backdrop-blur-md transition-all"
              title="Share Card (Viral!)"
            >
              <ImageIcon size={16} />
            </button>

            <button
              onClick={() => shareText(translatedText)}
              className="p-2.5 rounded-full bg-zinc-950/50 text-zinc-400 hover:text-white hover:bg-fuchsia-600 border border-white/10 backdrop-blur-md transition-all"
              title="Share Text"
            >
              <Share2 size={16} />
            </button>

            <button
              onClick={() => speakText(translatedText)}
              className={`p-2.5 rounded-full border border-white/10 backdrop-blur-md transition-all ${
                isSpeaking
                  ? "bg-orange-500 text-white animate-pulse"
                  : "bg-zinc-950/50 text-zinc-400 hover:text-white hover:bg-teal-600"
              }`}
              title="Listen"
            >
              <Volume2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
