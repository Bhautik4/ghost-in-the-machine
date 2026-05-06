import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Health check endpoint that keeps Supabase active.
 * Can be pinged by external cron services like cron-job.org or EasyCron.
 *
 * Security: Protected by secret token to prevent abuse.
 */
export async function GET(request: Request) {
  // Security: Require secret token
  const authHeader = request.headers.get("authorization");
  const urlParams = new URL(request.url).searchParams;
  const token = authHeader?.replace("Bearer ", "") || urlParams.get("token");

  const expectedToken = process.env.HEALTH_CHECK_SECRET;

  if (!expectedToken) {
    console.warn("HEALTH_CHECK_SECRET not configured");
    return NextResponse.json(
      { status: "error", message: "Health check not configured" },
      { status: 503 },
    );
  }

  if (token !== expectedToken) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { status: "error", message: "Supabase not configured" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Simple query to keep the database active
    const { error } = await supabase.from("profiles").select("count").limit(1);

    if (error) {
      console.error("Health check failed:", error);
      return NextResponse.json(
        {
          status: "error",
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "ok",
      message: "Supabase is active",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check exception:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
