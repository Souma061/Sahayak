import { Camera, Check, Mic, RefreshCw, RotateCw, Upload } from "lucide-react";

interface ControlPanelProps {
  imageSrc: string | null;
  isListening: boolean;
  isProcessing: boolean;
  sourceLang: string;
  setSourceLang: (lang: string) => void;
  onUploadTrigger: () => void;
  onCapture: () => void;
  onVoiceStart: () => void;
  onRetake: () => void;
  onRotate: () => void;
  onProcess: () => void;
  ocrLanguages: { code: string; label: string }[];
}

export default function ControlPanel({
  imageSrc,
  isListening,
  isProcessing,
  sourceLang,
  setSourceLang,
  onUploadTrigger,
  onCapture,
  onVoiceStart,
  onRetake,
  onRotate,
  onProcess,
  ocrLanguages,
}: ControlPanelProps) {
  if (!imageSrc) {
    return (
      <div className="flex gap-6 items-center w-full justify-center py-4">
        <button
          onClick={onUploadTrigger}
          className="group flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:bg-white/5"
        >
          <div className="p-4 rounded-full bg-white/10 group-hover:bg-violet-500 text-white transition-all shadow-lg border border-white/10 group-hover:scale-110">
            <Upload size={24} />
          </div>
          <span className="text-xs font-medium text-zinc-400 group-hover:text-white">
            Upload
          </span>
        </button>

        <button
          onClick={onCapture}
          className="p-6 rounded-full bg-violet-600 text-white shadow-xl shadow-violet-500/10 hover:bg-violet-500 hover:scale-105 transition-all active:scale-95 border-4 border-white/10"
        >
          <Camera size={40} />
        </button>

        <button
          onClick={onVoiceStart}
          className={`group flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:bg-white/5 ${isListening ? "animate-pulse" : ""}`}
        >
          <div
            className={`p-4 rounded-full transition-all shadow-lg border border-white/10 group-hover:scale-110 ${isListening ? "bg-red-500 text-white" : "bg-white/10 group-hover:bg-teal-500 text-white"}`}
          >
            <Mic size={24} />
          </div>
          <span
            className={`text-xs font-medium group-hover:text-white ${isListening ? "text-red-400 font-bold" : "text-zinc-400"}`}
          >
            {isListening ? "Listening" : "Voice"}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 w-full mt-4">
      <button
        onClick={onRetake}
        className="flex items-center justify-center gap-2 px-4 py-4 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl font-medium transition-all border border-white/5 hover:border-white/10"
      >
        <RefreshCw size={18} /> Retake
      </button>

      <button
        onClick={onRotate}
        className="flex items-center justify-center gap-2 px-4 py-4 bg-white/5 hover:bg-white/10 text-violet-300 hover:text-violet-200 rounded-xl font-medium transition-all border border-white/5 hover:border-violet-500/30"
      >
        <RotateCw size={18} /> Rotate
      </button>

      <div className="col-span-2 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
        <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">
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
        onClick={onProcess}
        disabled={isProcessing}
        className="col-span-2 flex items-center justify-center gap-2 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold shadow-lg shadow-teal-500/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
}
