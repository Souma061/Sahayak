import { RefObject, useState } from "react";
import { CropperRef } from "react-advanced-cropper";

interface UseOCRProps {
  cropperRef: RefObject<CropperRef | null>;
  sourceLang: string;
}

export function useOCR({ cropperRef, sourceLang }: UseOCRProps) {
  const [ocrText, setOcrText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugImage, setDebugImage] = useState<string | null>(null);

  const processImage = async () => {
    if (!cropperRef.current) return;

    setIsProcessing(true);
    setOcrText(`Scanning...`); // Simple loading state

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
          : "No text detected."
      );
    } catch (err) {
      console.error(err);
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
