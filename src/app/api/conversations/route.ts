/**
 * POST /api/conversations
 *
 * Enterprise API route for starting / fetching 1-to-1 conversations.
 * Uses server-side Supabase client to bypass client RLS hiccups while preserving
 * strict authentication and authorization checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface StartConversationRequest {
  recipientEmail?: string;
  recipientId?: string;
}

export async function POST(request: NextRequest) {
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

    const body: StartConversationRequest = await request.json();
    const { recipientEmail, recipientId } = body;

    if (!recipientEmail && !recipientId) {
      return NextResponse.json(
        { success: false, error: "Recipient email or ID is required." },
        { status: 400 }
      );
    }

    let targetUserId = recipientId;
    let targetFullName = "";

    // 2. Resolve recipient if email was passed
    if (recipientEmail) {
      const cleanEmail = recipientEmail.trim().toLowerCase();
      const { data: targetUser, error: userErr } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (userErr || !targetUser) {
        return NextResponse.json(
          {
            success: false,
            error: `No registered user found with email '${cleanEmail}'. Please ask them to join BuySell first.`,
          },
          { status: 404 }
        );
      }

      targetUserId = targetUser.id;
      targetFullName = targetUser.full_name || cleanEmail;
    }

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: "Target user could not be resolved." }, { status: 400 });
    }

    // 3. Prevent self-conversations
    if (targetUserId === user.id) {
      return NextResponse.json(
        { success: false, error: "You cannot start a conversation with yourself." },
        { status: 400 }
      );
    }

    // 4. Check if conversation already exists in either (A,B) or (B,A) order
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("*")
      .or(
        `and(participant_a.eq.${user.id},participant_b.eq.${targetUserId}),and(participant_a.eq.${targetUserId},participant_b.eq.${user.id})`
      )
      .maybeSingle();

    if (existingConv) {
      return NextResponse.json({
        success: true,
        data: {
          conversation: existingConv,
          isExisting: true,
          message: "Existing conversation retrieved.",
        },
      });
    }

    // 5. Create new conversation (resilient select without strict foreign key constraints)
    const now = new Date().toISOString();
    const { data: newConv, error: createErr } = await supabase
      .from("conversations")
      .insert({
        participant_a: user.id,
        participant_b: targetUserId,
        last_message_text: "Conversation started",
        last_message_at: now,
        created_at: now,
      })
      .select("*")
      .single();

    if (createErr || !newConv) {
      console.error("[API Conversations] Insert error:", createErr);

      if (createErr?.code === "42501" || createErr?.message?.includes("row-level security")) {
        return NextResponse.json(
          {
            success: false,
            error: "Database Row-Level Security policy error. Please execute messaging_migration.sql in Supabase SQL Editor.",
          },
          { status: 403 }
        );
      }

      const rawMsg = createErr?.message || "Database conversation insert failed.";
      return NextResponse.json({ success: false, error: rawMsg }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        conversation: newConv,
        isExisting: false,
        message: `Conversation started with ${targetFullName || "partner"}.`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API Conversations] Fatal error:", message);
    return NextResponse.json(
      { success: false, error: message || "Failed to initialize conversation channel." },
      { status: 500 }
    );
  }
}
