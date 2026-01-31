'use client';

import { Camera, Check, Globe, RefreshCw, RotateCw, Upload } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';
import { Cropper, CropperRef } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';

export default function SmartScanner() {
  const webcamRef = useRef<Webcam>(null);
  const cropperRef = useRef<CropperRef>(null); // Reference to the cropper tool
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [translatedText, setTranslatedText] = useState(''); // New State for Translation
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [debugImage, setDebugImage] = useState<string | null>(null); // DEBUG: To see what Tesseract sees

  // Capture from Webcam
  const capture = () => {
    const image = webcamRef.current?.getScreenshot();
    if (image) {
      setImageSrc(image);
      setOcrText('');
      setTranslatedText('');
      setDebugImage(null);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setOcrText('');
        setTranslatedText('');
        setDebugImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // 3. Translate Action
  const translateText = async () => {
    if (!ocrText) return;

    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ocrText, targetLang: 'hi' }), // Default to Hindi
      });

      const data = await response.json();
      if (data.translatedText) {
        setTranslatedText(data.translatedText);
      }
    } catch (error) {
      console.error("Translation failed", error);
      setTranslatedText("Failed to translate. Check connection.");
    } finally {
      setIsTranslating(false);
    }
  };

  // The "Read" Action
  const processImage = async () => {
    const cropper = cropperRef.current;
    if (!cropper) return;

    setIsProcessing(true);
    setOcrText('Scanning...');

    try {
      // 1. Get the cropped image directly from the library
      const canvas = cropper.getCanvas();
      if (!canvas) return;


      // Export as PNG (lossless)
      const croppedImageSrc = canvas.toDataURL('image/png');


      setDebugImage(croppedImageSrc);

      // Send to Tesseract
      const result = await Tesseract.recognize(
        croppedImageSrc,
        'eng',
        {
          logger: m => console.log(m),
          errorHandler: (err) => console.error(err)
        }
      );

      const extractedText = result.data.text.trim();

      if (extractedText.length > 0) {
        setOcrText(extractedText);
      } else {
        setOcrText("No text detected. Try better lighting or crop closer.");
      }

    } catch (e) {
      console.error(e);
      setOcrText('Failed to read text.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full max-w-md mx-auto">


      <div className="relative w-full aspect-[3/4] bg-black rounded-xl overflow-hidden border-2 border-gray-800 shadow-2xl">
        {!imageSrc ? (
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/png"
            className="w-full h-full object-cover"
            videoConstraints={{
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }}
          />
        ) : (
          <Cropper
            ref={cropperRef}
            src={imageSrc}
            className={'cropper'}
            stencilProps={{
              aspectRatio: NaN,
              grid: true
            }}
            backgroundClassName="bg-black"
          />
        )}
      </div>

      {/* DEBUG: Show what the computer sees */}
      {
        debugImage && (
          <div className="w-full p-2 border border-red-500 rounded bg-red-50 text-xs">
            <p>Debug: What Tesseract sees (Black & White):</p>
            <img src={debugImage} alt="Debug" className="h-20 w-auto border mt-1" />
          </div>
        )
      }


      <div className="w-full flex flex-col gap-4">
        {!imageSrc ? (
          <div className="flex justify-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-700 text-white p-4 rounded-full shadow-lg active:scale-95 transition"
              title="Upload Image"
            >
              <Upload size={24} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
            />

            <button
              onClick={capture}
              className="bg-green-600 text-white p-4 rounded-full shadow-lg active:scale-95 transition"
              title="Capture Photo"
            >
              <Camera size={32} />
            </button>
          </div>
        ) : (
          <>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setImageSrc(null)}
                className="flex items-center gap-2 px-5 py-3 bg-gray-700 text-white rounded-lg font-medium"
              >
                <RefreshCw size={18} /> Retake
              </button>

              <button
                onClick={() => {
                  if (cropperRef.current) {
                    cropperRef.current.rotateImage(90);
                  }
                }}
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-medium"
              >
                <RotateCw size={18} /> Rotate
              </button>

              <button
                onClick={processImage}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white rounded-lg font-bold shadow-lg active:scale-95 transition"
              >
                {isProcessing ? 'Reading...' : <><Check size={20} /> Read Selection</>}
              </button>
            </div>
          </>
        )}
      </div>

      {/* 3. RESULT CARD */}
      {ocrText && (
        <div className="w-full flex flex-col gap-4">
          <div className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">Detected Text</h3>
            <p className="text-gray-900 text-lg leading-relaxed whitespace-pre-wrap">
              {ocrText}
            </p>
          </div>

          <button
            onClick={translateText}
            disabled={isTranslating}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-md active:scale-95 transition"
          >
            {isTranslating ? 'Translating...' : <><Globe size={24} /> Translate to Hindi</>}
          </button>

          {/* 4. TRANSLATION RESULT */}
          {translatedText && (
            <div className="w-full p-6 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-sm">
              <h3 className="text-xs font-bold text-blue-600 mb-2 uppercase">Hindi Translation</h3>
              <p className="text-blue-900 text-xl font-medium leading-relaxed whitespace-pre-wrap">
                {translatedText}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
