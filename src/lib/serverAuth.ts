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
  request: NextRequest
): Promise<any> {
  const user = await verifyBearerToken(request);
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  return user;
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
