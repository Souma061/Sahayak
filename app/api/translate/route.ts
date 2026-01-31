import { LingoDotDevEngine } from "lingo.dev/sdk";
import { NextResponse } from 'next/server';

// NOTE: You must add LINGODOTDEV_API_KEY to your .env.local file
const lingo = new LingoDotDevEngine({
  apiKey: process.env.LINGODOTDEV_API_KEY as string,
});

export async function POST(request: Request) {
  try {
    const { text, targetLang } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.LINGODOTDEV_API_KEY) {
      console.warn("Lingo.dev API Key is missing. Returning mock translation.");
      // Fallback for demo so app doesn't crash without key
      return NextResponse.json({
        translatedText: `[MOCK TRANSLATION to ${targetLang}]: ${text}`,
        isMock: true
      });
    }

    // Call Lingo.dev
    const translatedText = await lingo.localizeText(text, {
      sourceLocale: "en",
      targetLocale: targetLang || 'hi', // Default to Hindi
    });

    return NextResponse.json({ translatedText });

  } catch (error) {
    console.error('Translation Error:', error);
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}
