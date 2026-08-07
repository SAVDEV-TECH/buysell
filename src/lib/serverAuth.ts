import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Creates a server-side Supabase client using the current request's cookies. */
async function getSupabaseUser(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new AuthError("Unauthorized", 401);
  return { supabase, user };
}

/** Verifies any authenticated user. Returns the Supabase user. */
export async function requireAuth(req: NextRequest) {
  const { user } = await getSupabaseUser(req);
  return user;
}

/** Verifies user has the super_admin role in the users table. */
export async function requireSuperAdmin(req: NextRequest) {
  const { supabase, user } = await getSupabaseUser(req);

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "super_admin") {
    throw new AuthError("Forbidden: Super Admin access required", 403);
  }

  return user;
}