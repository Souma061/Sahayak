import { ChangeEvent, useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";

export function useCamera() {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const capture = useCallback(() => {
    const image = webcamRef.current?.getScreenshot();
    if (image) {
      setImageSrc(image);
    }
  }, [webcamRef]);

  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const resetCamera = useCallback(() => {
    setImageSrc(null);
  }, []);

  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    webcamRef,
    fileInputRef,
    imageSrc,
    setImageSrc,
    capture,
    handleFileUpload,
    resetCamera,
    triggerFileUpload,
  };
}
