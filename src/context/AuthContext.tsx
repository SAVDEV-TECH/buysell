"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// New Postgres Enum roles
export type UserRole =
  | "super_admin"
  | "buyer_admin"
  | "buyer_staff"
  | "supplier_admin"
  | "supplier_sales"
  | "supplier_finance";

// Account approval status mapped to new verification_status enum on organizations
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface UserProfile {
  id: string;
  organization_id: string | null;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: UserRole;
  is_email_verified: boolean;
  organization?: {
    company_name: string;
    organization_type: "supplier" | "buyer" | "both";
    verification_level: VerificationStatus;
    is_active: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  organizationId: string | null;
  verificationLevel: VerificationStatus | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  organizationId: null,
  verificationLevel: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Stable ref — createClient() must not be called on every render or
  // the effect will re-subscribe to onAuthStateChange on every render.
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    let mounted = true;

    async function fetchProfile(authUser: User) {
      try {
        const { data, error } = await supabase
          .from("users")
          .select(`
            *,
            organization:organizations (
              company_name,
              organization_type,
              verification_level,
              is_active
            )
          `)
          .eq("id", authUser.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user profile:", error);
          if (mounted) setProfile(null);
          return;
        }

        if (mounted) {
          // @ts-ignore - Supabase type inference needs generated types
          setProfile(data as UserProfile | null);
        }
      } catch (err) {
        console.error("Auth context error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchProfile(session.user);
          } else {
            setProfile(null);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable ref — supabase never changes between renders

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        profile, 
        role: profile?.role ?? null,
        organizationId: profile?.organization_id ?? null,
        verificationLevel: profile?.organization?.verification_level ?? null,
        loading 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);