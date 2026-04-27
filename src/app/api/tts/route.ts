import { NextRequest, NextResponse } from "next/server";

/**
 * ElevenLabs Text-to-Speech proxy route.
 *
 * Used by:
 * - Paranoia Whispers (whisper: true → breathy, quiet)
 * - Ghost Taunts (whisper: false → clear, menacing)
 * - Victory/Defeat Narration (whisper: false)
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

    const { text, whisper } = await request.json();
    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    const voiceSettings = whisper
      ? {
          stability: 0.2,
          similarity_boost: 0.9,
          style: 0.3,
          use_speaker_boost: false,
        }
      : {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.7,
          use_speaker_boost: true,
        };

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: voiceSettings,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs TTS error:", err);
      return NextResponse.json(
        { error: "TTS failed", details: err },
        { status: response.status },
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("TTS route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
