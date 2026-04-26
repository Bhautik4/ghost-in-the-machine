import { NextRequest, NextResponse } from "next/server";

/**
 * ElevenLabs Speech-to-Speech proxy route.
 *
 * Voice settings change based on elapsed game time:
 * - 0:00–3:00: Low stability (0.3), high similarity (0.8) → eerie, distorted
 * - 3:00–4:00: High stability (0.7), high similarity (0.95) → clear, terrifyingly real
 *
 * The client sends `elapsedSeconds` in the form data to control this.
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

    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob | null;
    const elapsedStr = formData.get("elapsed") as string | null;
    const elapsed = elapsedStr ? parseInt(elapsedStr) : 0;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 },
      );
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    // Audio Climax: after 3 minutes, the ghost voice becomes terrifyingly clear
    const isClimax = elapsed >= 180;
    const voiceSettings = isClimax
      ? {
          stability: 0.7, // high stability → clear, human-like
          similarity_boost: 0.95, // very high → almost identical to the voice
          style: 0.9, // high expressiveness
          use_speaker_boost: true, // boost clarity
        }
      : {
          stability: 0.3, // low → eerie, unpredictable
          similarity_boost: 0.8, // keeps the creepy character
          style: 0.7,
          use_speaker_boost: false,
        };

    const stsForm = new FormData();
    stsForm.append("audio", audioFile);
    stsForm.append("model_id", "eleven_english_sts_v2");
    stsForm.append("voice_settings", JSON.stringify(voiceSettings));

    const response = await fetch(
      `https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: stsForm,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs STS error:", errorText);
      return NextResponse.json(
        { error: "Voice processing failed", details: errorText },
        { status: response.status },
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Voice route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
