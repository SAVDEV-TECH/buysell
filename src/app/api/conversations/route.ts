/**
 * POST /api/conversations
 *
 * Enterprise API route for starting / fetching 1-to-1 conversations.
 * Supports recipient lookup by email, full name, or user ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface StartConversationRequest {
  recipientQuery?: string;  // Email, Full Name, or User ID
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
    const query = (body.recipientQuery || body.recipientEmail || body.recipientId || "").trim();

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Recipient email, full name, or ID is required." },
        { status: 400 }
      );
    }

    let targetUserId = "";
    let targetFullName = "";
    let targetEmail = "";

    // 2. Resolve recipient by ID first, then email, then name
    if (query.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: userById } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("id", query)
        .maybeSingle();

      if (userById) {
        targetUserId = userById.id;
        targetFullName = userById.full_name;
        targetEmail = userById.email;
      } else {
        // Fallback: If it's an organization ID, get the owning user's ID
        const { data: orgData } = await supabase
          .from("organizations")
          .select("user_id")
          .eq("id", query)
          .maybeSingle();
          
        if (orgData?.user_id) {
           const { data: orgUser } = await supabase
             .from("users")
             .select("id, full_name, email")
             .eq("id", orgData.user_id)
             .maybeSingle();
           
           if (orgUser) {
             targetUserId = orgUser.id;
             targetFullName = orgUser.full_name;
             targetEmail = orgUser.email;
           }
        }
      }
    }

    if (!targetUserId) {
      // Lookup by email or full name
      const { data: targetUser, error: userErr } = await supabase
        .from("users")
        .select("id, full_name, email")
        .or(`email.ilike.${query},full_name.ilike.%${query}%`)
        .maybeSingle();

      if (userErr || !targetUser) {
        return NextResponse.json(
          {
            success: false,
            error: `No registered user found matching '${query}'. Please ask them to register on BuySell first.`,
          },
          { status: 404 }
        );
      }

      targetUserId = targetUser.id;
      targetFullName = targetUser.full_name || targetUser.email;
      targetEmail = targetUser.email;
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
          targetUser: { id: targetUserId, full_name: targetFullName, email: targetEmail },
          isExisting: true,
          message: "Existing conversation retrieved.",
        },
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
        targetUser: { id: targetUserId, full_name: targetFullName, email: targetEmail },
        isExisting: false,
        message: `Conversation started with ${targetFullName || targetEmail || "partner"}.`,
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
