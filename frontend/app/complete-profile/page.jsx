"use client";

import { useBlockingLoading } from '@/components/shared/GlobalLoading';
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";

export default function CompleteProfilePage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { supabaseUser, session, logout } = useAuthContext();
  const [formData, setFormData] = useState({
    displayName: "",
    birthMonth: "",
    birthDay: "",
    birthYear: "",
    schoolId: "",
    gender: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  useBlockingLoading(loading);
  const [nextPath, setNextPath] = useState("/dashboard");

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const isFormValid = useCallback(() => {
    return (
      formData.displayName.trim() !== "" &&
      formData.displayName.length >= 3 &&
      formData.displayName.length <= 20 &&
      formData.birthMonth !== "" &&
      formData.birthDay !== "" &&
      formData.birthYear !== "" &&
      formData.schoolId.trim() !== ""
    );
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { displayName, birthMonth, birthDay, birthYear, schoolId, gender } = formData;

    if (!displayName.trim()) {
      setError("Please enter a display name");
      return;
    }

    if (displayName.length < 3 || displayName.length > 20) {
      setError("Display name must be between 3-20 characters");
      return;
    }

    if (!birthMonth || !birthDay || !birthYear) {
      setError("Please select your complete birthday");
      return;
    }

    if (!schoolId.trim()) {
      setError("Please enter your school ID number");
      return;
    }

    setLoading(true);

    try {
      // Format birthday as ISO string
      const birthday = `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;

      const { supabase } = await import("@/lib/supabaseClient");
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Please sign in with Google again.");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/complete-profile`, {
        method: "POST",
          credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authData.session.access_token}`,
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
          birthday,
          school_id: schoolId.trim(),
          gender: gender === "prefer-not-to-say" ? undefined : gender || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to complete profile");
      }

      const data = await response.json();
      
      // Update local storage with new tokens
      localStorage.setItem("access_token", data.access_token);

    localStorage.removeItem("refresh_token");

      setSuccess("Profile completed successfully! Redirecting...");
      setTimeout(() => {
        window.location.href = nextPath;
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { supabase } = await import("@/lib/supabaseClient");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-up failed. Please try again.");
      setLoading(false);
    }
  }, [nextPath]);

  const months = [
    { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
    { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
    { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
    { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" },
  ];

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 26 }, (_, i) => currentYear - i);

  const genderOptions = [
    { value: "female", label: "Female" },
    { value: "male", label: "Male" },
    { value: "lgbtq+", label: "LGBTQ+" },
    { value: "prefer-not-to-say", label: "Prefer not to say" },
  ];

  useEffect(() => {
    const next = searchParams.get("next");
    if (next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
      setNextPath(next);
    }
  }, [searchParams]);

  return (
    <div className="login-page">
      <div className="login-centered-container">
        <div className="login-card register-card-wider">
          <div className="login-card-header">
            <h2>Complete Your Profile</h2>
            <p>Welcome! Please provide the remaining information to complete your account setup.</p>
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}
          {success && (
            <div className="success-message" role="alert" style={{ background: "rgba(78, 205, 196, 0.15)", border: "1px solid rgba(78, 205, 196, 0.3)", color: "#4ecdc4" }}>
              {success}
            </div>
          )}

          <form id="completeProfileForm" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="displayName" className="input-label">Display Name</label>
              <div className="input-wrapper">
                <i className="fas fa-user-circle input-icon-left" aria-hidden="true"></i>
                <input
                  type="text"
                  id="displayName"
                  placeholder="Choose a display name (3-20 characters)"
                  required
                  minLength={3}
                  maxLength={20}
                  value={formData.displayName}
                  onChange={(e) => handleChange("displayName", e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
              <small className="input-hint">This is how other users will see you. You can change it later in Profile Settings.</small>
            </div>

            <div className="input-group">
              <label htmlFor="birthMonth" className="input-label">Birthday</label>
              <div className="input-wrapper birthday-wrapper">
                <i className="fas fa-calendar input-icon-left" aria-hidden="true"></i>
                <div className="birthday-row">
                  <select
                    id="birthMonth"
                    value={formData.birthMonth}
                    onChange={(e) => handleChange("birthMonth", e.target.value)}
                    required
                    className="birthday-select"
                  >
                    <option value="">Month</option>
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    id="birthDay"
                    value={formData.birthDay}
                    onChange={(e) => handleChange("birthDay", e.target.value)}
                    required
                    className="birthday-select"
                  >
                    <option value="">Day</option>
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <select
                    id="birthYear"
                    value={formData.birthYear}
                    onChange={(e) => handleChange("birthYear", e.target.value)}
                    required
                    className="birthday-select"
                  >
                    <option value="">Year</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="schoolId" className="input-label">School ID Number</label>
              <div className="input-wrapper">
                <i className="fas fa-id-card input-icon-left" aria-hidden="true"></i>
                <input
                  type="text"
                  id="schoolId"
                  placeholder="Enter your school ID number"
                  required
                  value={formData.schoolId}
                  onChange={(e) => handleChange("schoolId", e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
              <small className="input-hint">Your unique school identification number.</small>
            </div>

            <div className="input-group">
              <label className="input-label">Gender <span className="optional-badge">Optional</span></label>
              <div className="input-wrapper gender-wrapper">
                <i className="fas fa-venus-mars input-icon-left" aria-hidden="true"></i>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                  className="gender-select"
                  disabled={loading}
                >
                  <option value="">Select gender</option>
                  {genderOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="login-button" disabled={loading || !isFormValid()}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                  Completing Profile...
                </>
              ) : (
                "Complete Profile"
              )}
            </button>

            <div className="divider"><span>or continue with</span></div>

            <button
              type="button"
              className="google-button"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <img src="/google.svg" alt="Google" className="google-icon" aria-hidden="true" />
              <span>Continue with Google</span>
            </button>
          </form>

          <p className="register-text">Need to sign out? <button onClick={logout} style={{ background: "none", border: "none", color: "var(--accent-cyan)", cursor: "pointer" }}>Log out</button></p>
        </div>
      </div>
    </div>
  );
}