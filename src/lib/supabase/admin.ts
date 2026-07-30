import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using Service Role Key.
 * BYPASSES Row-Level Security (RLS) safely on the server for Admin API routes.
 * NEVER expose this client to browser / client-side components.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Use service role key if available, otherwise fall back to anon key
  const keyToUse =
    serviceRoleKey && !serviceRoleKey.includes("your-supabase")
      ? serviceRoleKey
      : anonKey;

  return createClient(supabaseUrl, keyToUse, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
