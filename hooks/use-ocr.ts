import { RefObject, useEffect, useRef, useState } from "react";
import { CropperRef } from "react-advanced-cropper";
import { Worker, createWorker } from "tesseract.js";

interface UseOCRProps {
  cropperRef: RefObject<CropperRef | null>;
  sourceLang: string;
}

export function useOCR({ cropperRef, sourceLang }: UseOCRProps) {
  const [ocrText, setOcrText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugImage, setDebugImage] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize/Update Tesseract Worker when language changes
  useEffect(() => {
    let isMounted = true;

    const initWorker = async () => {
      // Clean up previous worker if it exists
      if (workerRef.current) {
        await workerRef.current.terminate();
        workerRef.current = null;
      }

      try {
        // Create new worker for the selected language
        // createWorker(lang) handles loading and initialization automatically in v5+
        const worker = await createWorker(sourceLang);

        if (isMounted) {
          workerRef.current = worker;
        } else {
          await worker.terminate();
        }
      } catch (err) {
        console.error("Failed to initialize Tesseract worker:", err);
      }
    };

    initWorker();

    return () => {
      isMounted = false;
      // Cleanup on unmount
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [sourceLang]);

  const processImage = async () => {
    if (!cropperRef.current) return;

    setIsProcessing(true);
    setOcrText("Scanning..."); // UX: consider a separate status state if this text flickers

    try {
      const canvas = cropperRef.current.getCanvas();
      if (!canvas) return;

      const image = canvas.toDataURL("image/png");
      setDebugImage(image);

      // Ensure worker is ready
      if (!workerRef.current) {
        // Attempt one-off fallback if worker isn't ready (rare race condition or init failure)
        // or simply wait/retry. For now, we'll try to re-init or just throw.
        const fallbackWorker = await createWorker(sourceLang);
        workerRef.current = fallbackWorker;
      }

      const {
        data: { text },
      } = await workerRef.current.recognize(image);

      const cleanedText = text?.trim();
      setOcrText(
        cleanedText && cleanedText.length > 0
          ? cleanedText
          : "No text detected."
      );
    } catch (err) {
      console.error("OCR Error:", err);
      setOcrText("Failed to read text. Please check the image and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearOCR = () => {
    setOcrText("");
    setDebugImage(null);
  };

  return {
    ocrText,
    setOcrText,
    isProcessing,
    debugImage,
    processImage,
    clearOCR,
  };
}
