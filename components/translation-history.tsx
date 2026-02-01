import { ChevronRight, Clock, Trash2, X } from "lucide-react";

interface HistoryItem {
  original: string;
  translated: string;
  timestamp?: number;
}

interface TranslationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  history: Record<string, string>; // keeping simple format for compatibility
  onSelect: (original: string, translated: string) => void;
  onDelete: (original: string) => void;
}

export default function TranslationHistory({
  isOpen,
  onClose,
  history,
  onSelect,
  onDelete,
}: TranslationHistoryProps) {
  if (!isOpen) return null;

  const historyEntries = Object.entries(history).reverse(); // Show newest (bottom of object) first as a rough heuristic

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-white">
            <Clock size={20} className="text-blue-400" />
            <h2 className="font-bold text-lg">History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto p-4 flex flex-col gap-3">
          {historyEntries.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>No saved translations yet.</p>
            </div>
          ) : (
            historyEntries.map(([original, translated]) => (
              <div
                key={original}
                className="group relative flex items-center bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 rounded-xl p-3 transition-all cursor-pointer"
                onClick={() => {
                  onSelect(original, translated);
                  onClose();
                }}
              >
                <div className="flex-1 min-w-0 pr-8">
                  <p className="text-sm font-medium text-gray-200 truncate mb-1">
                    {translated}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{original}</p>
                </div>

                <ChevronRight
                  size={16}
                  className="text-gray-600 group-hover:text-blue-400"
                />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(original);
                  }}
                  className="absolute right-2 top-2 p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                  title="Remove from history"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
