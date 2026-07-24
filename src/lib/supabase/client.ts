import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
  
  if (typeof window !== "undefined" && (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder"))) {
    console.error("[Supabase] NEXT_PUBLIC_SUPABASE_URL is missing or using placeholder in Vercel Environment Variables.");
  }
  
  return createBrowserClient(url, key);
}
