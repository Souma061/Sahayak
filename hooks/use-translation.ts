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

  const getCacheKey = useCallback(
    (text: string, lang: string) => `${text}-${lang}`,
    []
  );

  const saveToCache = useCallback(
    (text: string, lang: string, translation: string) => {
      const key = getCacheKey(text, lang);
      translationCache.current[key] = translation;
      setHistory({ ...translationCache.current });
      try {
        localStorage.setItem(
          "ocr-translation-cache",
          JSON.stringify(translationCache.current)
        );
      } catch (e) {
        console.error("Failed to save translation cache", e);
      }
    },
    [getCacheKey]
  );

  const deleteFromHistory = useCallback((key: string) => {
    const newCache = { ...translationCache.current };
    delete newCache[key];

    translationCache.current = newCache;
    setHistory(newCache);

    try {
      localStorage.setItem("ocr-translation-cache", JSON.stringify(newCache));
    } catch (e) {
      console.error("Failed to update cache", e);
    }
  }, []);

  const translate = useCallback(async (text: string, targetLang: string) => {
    if (!text) return;

    const cacheKey = getCacheKey(text, targetLang);
    if (translationCache.current[cacheKey]) {
      setTranslatedText(translationCache.current[cacheKey]);
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang }),
      });

      if (!res.ok) {
        throw new Error(`Translation failed with status: ${res.status}`);
      }

      const data = await res.json();
      const translated = data.translatedText || "Translation failed.";

      setTranslatedText(translated);

      if (data.translatedText) {
        saveToCache(text, targetLang, translated);
      }
    } catch (error) {
      console.error("Translation error:", error);
      setTranslatedText("Failed to translate.");
    } finally {
      setIsTranslating(false);
    }
  }, [getCacheKey, saveToCache]);

  return {
    translatedText,
    setTranslatedText,
    isTranslating,
    translate,
    history,
    deleteFromHistory,
  };
}
