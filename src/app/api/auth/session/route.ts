import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyCorsHeaders, handleCorsPrelight } from "@/lib/cors";

/** Handle CORS preflight for cross-origin clients (e.g., mobile app) */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPrelight(request);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = NextResponse.json({ success: true, session });
  return applyCorsHeaders(request, response);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = NextResponse.json({ success: true });
  return applyCorsHeaders(request, response);
}
