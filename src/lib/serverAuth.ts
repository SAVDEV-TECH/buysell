import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function verifyBearerToken(
  request: NextRequest
): Promise<any | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function verifySessionCookie(
  sessionCookie: string
): Promise<any | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function requireAuth(
  request?: NextRequest
): Promise<any> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AuthError("Unauthorized", 401);
  }
  return user;
}

export async function requireSuperAdmin(request?: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AuthError("Unauthorized: Session login required", 401);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isSuperAdmin = profile?.role === "super_admin" || user.app_metadata?.role === "super_admin";
  if (!isSuperAdmin) {
    throw new AuthError("Forbidden: Super Admin privileges required", 403);
  }

  return { user, profile };
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
