import { NextRequest, NextResponse } from "next/server";

/**
 * ElevenLabs Sound Generation proxy route.
 * Generates sound effects from text prompts.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY not configured" },
        { status: 500 },
      );
    }

    const { prompt, duration } = await request.json();
    if (!prompt) {
      return NextResponse.json(
        { error: "No prompt provided" },
        { status: 400 },
      );
    }

    const response = await fetch(
      "https://api.elevenlabs.io/v1/sound-generation",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: prompt,
          duration_seconds: duration || 2,
          prompt_influence: 0.5,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs SFX error:", err);
      return NextResponse.json(
        { error: "SFX generation failed", details: err },
        { status: response.status },
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("SFX route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
