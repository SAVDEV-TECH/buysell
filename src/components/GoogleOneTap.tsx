"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

/** Pages where One Tap should not compete with an active auth flow. */
const EXCLUDED_PATHS = ["/verify-email", "/mfa-verify", "/mfa-setup"];

const generateNonce = async (): Promise<[string, string]> => {
  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
  );
  const encoder = new TextEncoder();
  const encodedNonce = encoder.encode(nonce);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedNonce);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return [nonce, hashedNonce];
};

export default function GoogleOneTap() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // ── Stable refs — never change between renders, so useEffect stays calm ──
  // Keeping the Supabase client in a ref guarantees the same object reference
  // on every render, which prevents the handleCredentialResponse callback from
  // being recreated and accidentally cancelling an active One Tap prompt.
  const supabaseRef = useRef(createClient());
  const routerRef = useRef(router);
  const rawNonceRef = useRef<string>("");
  const cancelledRef = useRef(false);
  const initializedRef = useRef(false);

  // Keep routerRef current without triggering re-renders
  useEffect(() => { routerRef.current = router; }, [router]);

  useEffect(() => {
    // ── Gate conditions ─────────────────────────────────────────────────────
    if (loading) return;
    if (user) return;
    if (!scriptLoaded) return;
    if (EXCLUDED_PATHS.includes(pathname)) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const googleLib = (window as any).google;
    if (!googleLib) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn("[GoogleOneTap] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.");
      return;
    }

    // Already initialised for this session — don't re-initialise unless the
    // route changed to a new non-excluded page (handled by cleanup below).
    if (initializedRef.current) return;

    cancelledRef.current = false;
    initializedRef.current = true;

    const supabase = supabaseRef.current;

    // Credential handler — defined inline so it closes over stable refs only
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCredentialResponse = async (response: any) => {
      try {
        const { credential } = response;

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: credential,
          nonce: rawNonceRef.current,
        });

        if (error) {
          if (error.message?.includes("not enabled")) {
            console.warn("[GoogleOneTap] Google provider not enabled in Supabase → Auth → Providers → Google.");
          } else {
            console.warn("[GoogleOneTap] sign-in error:", error.message);
          }
          return;
        }

        if (!data?.user) return;

        // Ensure public.users profile row exists for first-time Google users
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("users").insert({
            id: data.user.id,
            email: data.user.email,
            password_hash: "SUPABASE_OAUTH",
            full_name:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              data.user.email?.split("@")[0] ||
              "Google User",
            role: "buyer_admin",
            is_email_verified: true,
          });
          routerRef.current.push("/onboarding/business");
          return;
        }

        routerRef.current.push("/dashboard");
      } catch (err) {
        console.error("[GoogleOneTap] Unexpected error:", err);
      }
    };

    const init = async () => {
      const [rawNonce, hashedNonce] = await generateNonce();
      if (cancelledRef.current) return;
      rawNonceRef.current = rawNonce;

      // FedCM requires HTTPS. On plain http://localhost we use the legacy
      // popup mode (use_fedcm_for_prompt: false) which works without HTTPS.
      const isPlainLocalhost =
        window.location.protocol === "http:" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      googleLib.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        nonce: hashedNonce,
        auto_select: true,           // Silently sign in returning users
        cancel_on_tap_outside: true,
        itp_support: true,           // Required for Safari / strict-privacy Chrome
        context: "signin",
        use_fedcm_for_prompt: !isPlainLocalhost,
      });

      if (cancelledRef.current) return;
      googleLib.accounts.id.prompt();
    };

    init().catch(() => {
      // Silently swallow initialisation errors (network timeouts etc.)
    });

    return () => {
      cancelledRef.current = true;
      initializedRef.current = false; // Reset so the next page can re-initialise
      try {
        googleLib.accounts.id.cancel();
      } catch {
        /* ignore */
      }
    };

  // Intentionally omit handleCredentialResponse from deps — it's defined
  // inline and closes over stable refs only. Including it would cause the
  // effect to re-run (and cancel One Tap) on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, scriptLoaded, pathname]);

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      onLoad={() => setScriptLoaded(true)}
      strategy="afterInteractive"
    />
  );
}
