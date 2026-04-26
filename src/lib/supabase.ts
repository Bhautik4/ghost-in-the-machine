import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser-side Supabase client.
 * Uses the public anon key – row-level security on the `profiles`
 * table should be configured in your Supabase dashboard.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Ensure a profile row exists for the given player.
 * Uses upsert so it's a single call — creates if missing, no-ops if exists.
 */
export async function ensureProfile(playerId: string, name: string) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: playerId, name }, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error(
      "Supabase ensureProfile error:",
      error.message,
      error.code,
      error.details,
      error.hint,
    );
    throw new Error(`Supabase error: ${error.message}`);
  }

  return data;
}
