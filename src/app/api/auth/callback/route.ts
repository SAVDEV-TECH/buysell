import { GET as callbackHandler } from "@/app/auth/callback/route";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return callbackHandler(request);
}
