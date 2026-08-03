/**
 * POST /api/conversations
 *
 * Enterprise API route for starting / fetching 1-to-1 conversations.
 * Uses server-side Supabase client to bypass client RLS hiccups while preserving
 * strict authentication and authorization checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, successResponse } from "@/lib/apiResponse";

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
            error: `No registered user found with email '${cleanEmail}'. Please ask them to join BuySell.`,
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
      .select(`
        *,
        participant_a_profile:users!conversations_participant_a_fkey(full_name, avatar_url),
        participant_b_profile:users!conversations_participant_b_fkey(full_name, avatar_url)
      `)
      .or(
        `and(participant_a.eq.${user.id},participant_b.eq.${targetUserId}),and(participant_a.eq.${targetUserId},participant_b.eq.${user.id})`
      )
      .maybeSingle();

    if (existingConv) {
      return successResponse({
        conversation: existingConv,
        isExisting: true,
        message: "Existing conversation retrieved.",
      });
    }

    // 5. Create new conversation safely
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
      .select(`
        *,
        participant_a_profile:users!conversations_participant_a_fkey(full_name, avatar_url),
        participant_b_profile:users!conversations_participant_b_fkey(full_name, avatar_url)
      `)
      .single();

    if (createErr) {
      console.error("[API Conversations] Insert error:", createErr);

      // Handle RLS policy violation specifically
      if (createErr.code === "42501" || createErr.message?.includes("row-level security")) {
        return NextResponse.json(
          {
            success: false,
            error: "Database Row-Level Security policy error. Please execute messaging_migration.sql in Supabase SQL Editor to grant messaging permissions.",
            code: "RLS_VIOLATION",
          },
          { status: 403 }
        );
      }

      throw createErr;
    }

    return successResponse({
      conversation: newConv,
      isExisting: false,
      message: `Conversation started with ${targetFullName || "partner"}.`,
    });
  } catch (error: unknown) {
    return handleApiError(error, "Failed to initialize conversation channel");
  }
}
