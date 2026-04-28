import { NextRequest, NextResponse } from "next/server";
import { generateScenario } from "@/lib/scenarioGenerator";
import { getStaticScenario } from "@/lib/staticScenarioBank";

/**
 * POST /api/generate-scenario
 *
 * Generates a unique interconnected scenario for a game session using Gemini 3 Flash.
 * Falls back to static scenarios if generation fails or no API key is set.
 *
 * Body: { roomCode: string }
 * Returns: { scenario: Scenario, generated: boolean, reason?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { roomCode } = await request.json();

    if (!roomCode || typeof roomCode !== "string") {
      return NextResponse.json(
        { error: "roomCode is required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn(
        "[GenerateScenario] GEMINI_API_KEY not configured, using static scenario",
      );
      return NextResponse.json({
        scenario: getStaticScenario(roomCode),
        generated: false,
        reason: "GEMINI_API_KEY not configured",
      });
    }

    try {
      const scenario = await generateScenario(apiKey);

      if (!scenario) {
        console.warn(
          "[GenerateScenario] Generation returned null, falling back to static",
        );
        return NextResponse.json({
          scenario: getStaticScenario(roomCode),
          generated: false,
          reason: "Generation failed after retries",
        });
      }

      return NextResponse.json({
        scenario,
        generated: true,
      });
    } catch (err) {
      console.error("[GenerateScenario] LLM generation failed:", err);
      return NextResponse.json({
        scenario: getStaticScenario(roomCode),
        generated: false,
        reason: "LLM generation failed",
      });
    }
  } catch (error) {
    console.error("[GenerateScenario] Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
