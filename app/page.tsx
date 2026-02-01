import OcrScanner from "@/components/ocr-scanner";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-8">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 text-center mb-6 md:mb-10 tracking-tight">
          Sahayak
          <span className="block text-xs md:text-sm font-normal text-gray-400 mt-2 tracking-widest uppercase">
            The Intelligent Eye
          </span>
        </h1>

        {/* Render the OCR Component here */}
        <OcrScanner />
      </div>
    </main>
  );
}
