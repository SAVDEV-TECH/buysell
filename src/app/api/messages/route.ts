/**
 * GET /api/messages?conversationId=...
 *
 * Enterprise server-side API route to fetch all messages in a conversation.
 * Verifies that the requesting user is a participant (participant_a or participant_b)
 * before returning messages, bypassing client-side RLS policy hiccups.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in again." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: "Missing conversationId parameter." },
        { status: 400 }
      );
    }

    // 2. Verify user is a participant of this conversation
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id, participant_a, participant_b")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conv) {
      return NextResponse.json(
        { success: false, error: "Conversation not found." },
        { status: 404 }
      );
    }

    if (conv.participant_a !== user.id && conv.participant_b !== user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You are not a participant in this conversation." },
        { status: 403 }
      );
    }

    // 3. Fetch all messages for this conversation
    const { data: messages, error: msgsErr } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (msgsErr) {
      console.error("[API Messages] Error fetching messages:", msgsErr);
      return NextResponse.json(
        { success: false, error: msgsErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: messages || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API Messages] Server error:", message);
    return NextResponse.json(
      { success: false, error: message || "Failed to fetch messages." },
      { status: 500 }
    );
  }
}
