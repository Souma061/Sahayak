import { HfInference } from "@huggingface/inference";
import { NextResponse } from "next/server";

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function POST(request: Request) {
  let text = "";

  try {
    const body = await request.json();
    text = body.text;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    console.log("Summarizing text with Hugging Face (Mistral)...");

    // Mistral is extremely popular, so it's usually "warm" (active) on the free tier
    const response = await hf.chatCompletion({
      model: "mistralai/Mistral-7B-Instruct-v0.3",
      messages: [
        { role: "system", content: "Summarize this in 3 sentences." },
        { role: "user", content: text }
      ],
      max_tokens: 200,
      temperature: 0.5,
    });

    const summary = response.choices[0].message.content || "No summary generated.";

    console.log("Summary generated:", summary);
    return NextResponse.json({ summary });

  } catch (error: unknown) {
    console.error("Explanation Error:", error);

    // Fallback Preview
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
    const preview = sentences.slice(0, 3).join(" ");

    return NextResponse.json({
      summary: `(AI Unavailable) Preview: ${preview}...`
    });
  }
}
