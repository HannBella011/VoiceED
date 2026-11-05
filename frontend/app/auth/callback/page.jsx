"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const syncProfileWithBackend = async (accessToken) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiBase}/auth/callback`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn("Backend profile sync failed:", await response.text());
        return null;
      }

      return await response.json();
    } catch (err) {
      console.warn("Backend sync error:", err);
      return null;
    }
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const next = searchParams.get("next") || "/dashboard";

      if (error) {
        console.error("OAuth error:", error, errorDescription);
        router.push(`/login?error=${encodeURIComponent(errorDescription || error)}`);
        return;
      }

      if (code) {
        try {
          // Exchange the auth code for a session
          const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

          if (sessionError) {
            console.error("Session exchange error:", sessionError);
            router.push(`/login?error=${encodeURIComponent(sessionError.message)}`);
            return;
          }

          if (data.session?.user) {
            // Sync profile with backend
            const result = await syncProfileWithBackend(data.session.access_token);

            if (result && !result.profile_complete) {
              // Profile incomplete - redirect to complete profile page
              router.push(`/complete-profile?next=${encodeURIComponent(next)}`);
            } else {
              // Redirect to intended page or dashboard
              router.push(next);
            }
          } else {
            router.push("/login?error=Authentication failed - no user session");
          }
        } catch (err) {
          console.error("Auth callback error:", err);
          router.push(`/login?error=${encodeURIComponent("Authentication failed")}`);
        }
      } else {
        // No code in URL, might be a direct navigation
        router.push("/login");
      }
    };

    handleAuthCallback();
  }, [searchParams, router, syncProfileWithBackend]);

  return (
    <div className="login-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="login-card" style={{ textAlign: "center", padding: "3rem" }}>
        <div className="login-card-header">
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
          <h2>Completing Sign In</h2>
          <p>Please wait while we finish signing you in...</p>
        </div>
        <div style={{ color: "var(--text-secondary)" }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem" }}></i>
        </div>
      </div>
    </div>
  );
}