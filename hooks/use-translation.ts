import { useCallback, useEffect, useRef, useState } from "react";

export function useTranslation() {
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [history, setHistory] = useState<Record<string, string>>({});

  // Cache ref backed by localStorage
  const translationCache = useRef<Record<string, string>>({});

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
    setHistory({ ...translationCache.current });
    try {
      localStorage.setItem(
        "ocr-translation-cache",
        JSON.stringify(translationCache.current)
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

  const translate = useCallback(async (text: string, targetLang: string) => {
    if (!text) return;

    if (translationCache.current[text]) {
      setTranslatedText(translationCache.current[text]);
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang }),
      });

      const data = await res.json();
      const translated = data.translatedText || "Translation failed.";

      setTranslatedText(translated);

      if (data.translatedText) {
        saveToCache(text, translated);
      }
    } catch {
      setTranslatedText("Failed to translate.");
    } finally {
      setIsTranslating(false);
    }
  }, []);

  return {
    translatedText,
    setTranslatedText,
    isTranslating,
    translate,
    history,
    deleteFromHistory,
  };
}
