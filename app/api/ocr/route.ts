
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { NextResponse } from 'next/server';

// Initialize the client
const client = new ImageAnnotatorClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    // Handle both string literal "\n" and actual newlines if present
    private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    project_id: process.env.GOOGLE_PROJECT_ID,
  },
});

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');

    const [result] = await client.textDetection(buffer);
    const detections = result.textAnnotations;

    // The first annotation is the entire detected text block
    const text = detections && detections.length > 0 ? detections[0].description : '';

    return NextResponse.json({ text });
  } catch (error: unknown) {
    console.error('Google Cloud Vision Error Detailed:', JSON.stringify(error, null, 2));

    // Detailed error for debugging
    const err = error as { details?: string; message?: string };
    const errorMessage = err.details || err.message || 'Unknown error occurred';

    return NextResponse.json({
      error: `Failed to process image: ${errorMessage}`,
      details: errorMessage
    }, { status: 500 });
  }
}
