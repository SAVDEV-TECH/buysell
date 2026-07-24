"use client";

import { createClient } from "@/lib/supabase/client";

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

export async function syncSessionCookie(): Promise<void> {
  // Session cookie management is handled automatically by @supabase/ssr in middleware / server client
}

export async function clearSessionCookie(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}
