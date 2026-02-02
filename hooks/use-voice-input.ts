import { useCallback, useRef, useState } from "react";

interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface WindowWithSpeech extends Window {
  webkitSpeechRecognition: new () => SpeechRecognition;
  SpeechRecognition: new () => SpeechRecognition;
}

interface UseVoiceInputProps {
  onTranscript: (text: string) => void;
  lang?: string;
}

export function useVoiceInput({ onTranscript, lang = "en-US" }: UseVoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startVoiceInput = useCallback(() => {
    const win = window as unknown as WindowWithSpeech;

    if (!win.webkitSpeechRecognition && !win.SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    onTranscript("Listening...");

    try {
      recognition.start();
    } catch (e) {
      console.error("Recognition start error:", e);
      setIsListening(false);
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const speechResult = event.results[0][0].transcript;
      onTranscript(speechResult);
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);

      if (event.error === "network") {
        alert("Voice input failed. Network error or browser blocking.");
      } else if (event.error === "not-allowed") {
        alert("Microphone access denied.");
      } else if (event.error === "no-speech") {
        // quiet
      } else {
        alert(`Voice input error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }, [lang, onTranscript]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return {
    isListening,
    startVoiceInput,
    stopVoiceInput,
  };
}
