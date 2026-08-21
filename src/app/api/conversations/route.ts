/**
 * POST /api/conversations
 *
 * Enterprise API route for starting / fetching 1-to-1 conversations.
 * Supports recipient lookup by email, full name, organization ID, or user ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface StartConversationRequest {
  recipientQuery?: string; // Email, Full Name, Org ID, or User ID
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

    const adminSupabase = createAdminClient();

    let targetUserId = "";
    let targetFullName = "";
    let targetEmail = "";

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

    // 2. Resolve recipient by ID (User ID or Organization ID)
    if (isUUID) {
      // 2a. Check if query is a direct user ID
      const { data: userById } = await adminSupabase
        .from("users")
        .select("id, full_name, email")
        .eq("id", query)
        .maybeSingle();

      if (userById) {
        targetUserId = userById.id;
        targetFullName = userById.full_name || userById.email || "Partner";
        targetEmail = userById.email;
      } else {
        // 2b. Check if query is an Organization ID
        const { data: orgData } = await adminSupabase
          .from("organizations")
          .select("id, company_name, phone")
          .eq("id", query)
          .maybeSingle();

        if (orgData) {
          // Find any user linked to this organization
          const { data: orgUsers } = await adminSupabase
            .from("users")
            .select("id, full_name, email, role")
            .eq("organization_id", orgData.id)
            .order("created_at", { ascending: true });

          if (orgUsers && orgUsers.length > 0) {
            const primaryUser = orgUsers.find((u) => u.role?.includes("admin")) || orgUsers[0];
            targetUserId = primaryUser.id;
            targetFullName = primaryUser.full_name || orgData.company_name;
            targetEmail = primaryUser.email;
          } else {
            // Auto-provision a supplier user contact for this organization so chat is always active
            const placeholderEmail = `supplier-${orgData.id.slice(0, 8)}@buysell.africa`;
            const { data: existingPlaceholder } = await adminSupabase
              .from("users")
              .select("id, full_name, email")
              .eq("email", placeholderEmail)
              .maybeSingle();

            if (existingPlaceholder) {
              targetUserId = existingPlaceholder.id;
              targetFullName = orgData.company_name;
              targetEmail = existingPlaceholder.email;
            } else {
              const { data: newOrgUser } = await adminSupabase
                .from("users")
                .insert({
                  id: orgData.id,
                  email: placeholderEmail,
                  full_name: orgData.company_name,
                  organization_id: orgData.id,
                  role: "supplier_admin",
                  is_email_verified: true,
                })
                .select("id, full_name, email")
                .maybeSingle();

              if (newOrgUser) {
                targetUserId = newOrgUser.id;
                targetFullName = newOrgUser.full_name;
                targetEmail = newOrgUser.email;
              } else {
                const { data: fallbackUser } = await adminSupabase
                  .from("users")
                  .insert({
                    email: placeholderEmail,
                    full_name: orgData.company_name,
                    organization_id: orgData.id,
                    role: "supplier_admin",
                    is_email_verified: true,
                  })
                  .select("id, full_name, email")
                  .maybeSingle();

                if (fallbackUser) {
                  targetUserId = fallbackUser.id;
                  targetFullName = fallbackUser.full_name;
                  targetEmail = fallbackUser.email;
                }
              }
            }
          }
        }
      }
    }

    if (!targetUserId) {
      // 3a. Lookup by email or full name in users table
      const { data: targetUser } = await adminSupabase
        .from("users")
        .select("id, full_name, email")
        .or(`email.ilike.${query},full_name.ilike.%${query}%`)
        .maybeSingle();

      if (targetUser) {
        targetUserId = targetUser.id;
        targetFullName = targetUser.full_name || targetUser.email;
        targetEmail = targetUser.email;
      } else {
        // 3b. Lookup by organization company name
        const { data: orgByName } = await adminSupabase
          .from("organizations")
          .select("id, company_name")
          .ilike("company_name", `%${query}%`)
          .maybeSingle();

        if (orgByName) {
          const { data: orgUsers } = await adminSupabase
            .from("users")
            .select("id, full_name, email, role")
            .eq("organization_id", orgByName.id)
            .order("created_at", { ascending: true });

          if (orgUsers && orgUsers.length > 0) {
            const primaryUser = orgUsers.find((u) => u.role?.includes("admin")) || orgUsers[0];
            targetUserId = primaryUser.id;
            targetFullName = primaryUser.full_name || orgByName.company_name;
            targetEmail = primaryUser.email;
          }
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not connect with "${query}". Please verify the supplier or send an RFQ inquiry.`,
        },
        { status: 404 }
      );
    }

    // 4. Prevent self-conversations
    if (targetUserId === user.id) {
      return NextResponse.json(
        { success: false, error: "You cannot start a conversation with yourself." },
        { status: 400 }
      );
    }

    // 5. Check if conversation already exists in either (A,B) or (B,A) order
    const { data: existingConv } = await adminSupabase
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

    // 6. Create new conversation safely using admin client
    const now = new Date().toISOString();
    const { data: newConv, error: createErr } = await adminSupabase
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
