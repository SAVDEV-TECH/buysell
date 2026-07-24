import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) throw error;

    return NextResponse.json({ success: true, message: "All sessions revoked" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to revoke sessions";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
