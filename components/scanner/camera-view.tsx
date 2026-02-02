import Image from "next/image";
import { RefObject } from "react";
import { Cropper, CropperRef } from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";
import Webcam from "react-webcam";

interface CameraViewProps {
  imageSrc: string | null;
  webcamRef: RefObject<Webcam | null>;
  cropperRef: RefObject<CropperRef | null>;
  debugImage: string | null;
}

export default function CameraView({
  imageSrc,
  webcamRef,
  cropperRef,
  debugImage,
}: CameraViewProps) {
  return (
    <div className="flex flex-col gap-6 bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-6">
      <div className="relative w-full aspect-[3/4] md:aspect-video bg-black/40 rounded-2xl overflow-hidden border-2 border-white/10 shadow-inner group">
        {!imageSrc ? (
          <>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/png"
              forceScreenshotSourceSize={true}
              className="w-full h-full object-cover opacity-80"
              videoConstraints={{
                facingMode: "environment",
                width: 1280,
                height: 720,
              }}
            />
            <div className="absolute inset-0 bg-violet-500/10 pointer-events-none animate-scan opacity-50" />
            <div className="absolute inset-0 border-2 border-white/20 rounded-2xl pointer-events-none" />
          </>
        ) : (
          <Cropper
            ref={cropperRef}
            src={imageSrc}
            stencilProps={{
              grid: true,
              lines: true,
              handlers: {
                eastSouth: true,
                westNorth: true,
                westSouth: true,
                eastNorth: true,
              },
            }}
            backgroundClassName="bg-black/90"
            className="rounded-2xl"
          />
        )}
      </div>

      {debugImage && (
        <div className="w-full p-3 border border-yellow-500/30 rounded-xl bg-yellow-500/10 text-xs text-yellow-200/80 flex items-center justify-between">
          <span>Debug Preview</span>
          <Image
            src={debugImage}
            alt="OCR Debug"
            width={100}
            height={40}
            className="h-10 w-auto rounded border border-white/10"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}
