import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    // No code — redirect to login with an error hint
    return NextResponse.redirect(`${origin}/login?error=oauth_no_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from a Server Component — safe to ignore.
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[auth/callback] exchangeCodeForSession error:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=oauth_exchange_failed`);
  }

  const authUser = data.session.user;

  // Check if a public.users profile already exists
  const { data: existingProfile } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", authUser.id)
    .maybeSingle();

  if (!existingProfile) {
    // New OAuth user — create a minimal profile row.
    // Role defaults to "buyer_admin"; they can upgrade in the dashboard.
    await supabase.from("users").insert({
      id: authUser.id,
      email: authUser.email,
      password_hash: "SUPABASE_OAUTH",
      full_name:
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split("@")[0] ||
        "User",
      role: "buyer_admin",
      is_email_verified: true,
    });

    // First-time OAuth user → send to onboarding
    return NextResponse.redirect(`${origin}/onboarding/business`);
  }

  // Returning user → honour the `next` param (defaults to /dashboard)
  return NextResponse.redirect(`${origin}${next}`);
}
