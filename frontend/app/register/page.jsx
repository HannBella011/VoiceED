"use client";

import { useBlockingLoading } from '@/components/shared/GlobalLoading';
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";

export default function RegisterPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { register } = useAuthContext();
  const [formData, setFormData] = useState({
    fullName: "",
    displayName: "",
    birthMonth: "",
    birthDay: "",
    birthYear: "",
    email: "",
    password: "",
    confirmPassword: "",
    schoolId: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  useBlockingLoading(loading);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showStrength, setShowStrength] = useState(false);

  const validatePassword = useCallback((password) => {
    const requirements = {
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    setPasswordRequirements(requirements);
    setShowStrength(password.length > 0);

    let score = 0;
    if (requirements.minLength) score++;
    if (requirements.uppercase) score++;
    if (requirements.lowercase) score++;
    if (requirements.number) score++;
    if (requirements.special) score++;
    const displayScore = score <= 1 ? 0 : score - 1;
    setPasswordStrength(displayScore);
  }, []);

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "password") {
      validatePassword(value);
    }
  }, [validatePassword]);

  const handleConfirmPasswordChange = useCallback((value) => {
    setFormData((prev) => ({ ...prev, confirmPassword: value }));
  }, []);

  const allRequirementsMet = useCallback(() => {
    return Object.values(passwordRequirements).every((req) => req);
  }, [passwordRequirements]);

  const passwordsMatch = useCallback(() => {
    return formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;
  }, [formData.password, formData.confirmPassword]);

  const isFormValid = useCallback(() => {
    return (
      allRequirementsMet() &&
      passwordsMatch() &&
      formData.fullName.trim() !== "" &&
      formData.displayName.trim() !== "" &&
      formData.birthMonth !== "" &&
      formData.birthDay !== "" &&
      formData.birthYear !== "" &&
      formData.email.trim() !== "" &&
      formData.schoolId.trim() !== ""
    );
  }, [allRequirementsMet, passwordsMatch, formData]);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { supabase } = await import("@/lib/supabaseClient");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-up failed. Please try again.");
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { fullName, displayName, birthMonth, birthDay, birthYear, email, password, confirmPassword, schoolId } = formData;

    // Validate required fields
    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }

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

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (!schoolId.trim()) {
      setError("Please enter your school ID number");
      return;
    }

    if (!allRequirementsMet()) {
      setError("Please meet all password requirements");
      return;
    }

    if (!passwordsMatch()) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Format birthday as ISO string
      const birthday = `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;

      await register({
        fullName: fullName.trim(),
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        schoolId: schoolId.trim(),
        birthday,
        termsAccepted: true,
      });

      setSuccess("Account created successfully! Redirecting to login page...");
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const months = [
    { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
    { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
    { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
    { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" },
  ];

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 26 }, (_, i) => currentYear - i);

  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["#ff4444", "#ff8800", "#ffcc00", "#88cc00", "#00cc44"];

  return (
    <div className="login-page">
      <div className="login-centered-container">
        <div className="login-card register-card-wider">
          <div className="login-card-header">
            <h2>Create Account</h2>
            <p>Sign up to access VoiceED services</p>
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}
          {success && (
            <div className="success-message" role="alert" style={{ background: "rgba(78, 205, 196, 0.15)", border: "1px solid rgba(78, 205, 196, 0.3)", color: "#4ecdc4" }}>
              {success}
            </div>
          )}

          <form id="registerForm" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="fullName" className="input-label">Full Name</label>
              <div className="input-wrapper">
                <i className="fas fa-user input-icon-left" aria-hidden="true"></i>
                <input
                  type="text"
                  id="fullName"
                  placeholder="Enter your full legal name"
                  required
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
            </div>

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
              <label htmlFor="email" className="input-label">Email</label>
              <div className="input-wrapper">
                <i className="fas fa-envelope input-icon-left" aria-hidden="true"></i>
                <input
                  type="email"
                  id="email"
                  placeholder="Enter your email address"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password" className="input-label">Password</label>
              <div className="input-wrapper">
                <i className="fas fa-lock input-icon-left" aria-hidden="true"></i>
                <input
                  type="password"
                  id="password"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  className={showStrength ? (allRequirementsMet() ? "valid" : "invalid") : ""}
                />
              </div>

              {showStrength && (
                <div className="password-strength-wrapper">
                  <div className="password-strength-container">
                    <div className="password-strength-meter">
                      <div
                        className="password-strength-bar"
                        style={{
                          width: `${((passwordStrength + 1) / 5) * 100}%`,
                          backgroundColor: passwordStrength >= 0 ? strengthColors[passwordStrength] : "transparent",
                        }}
                      />
                    </div>
                    <span className="password-strength-label">{strengthLabels[passwordStrength] || ""}</span>
                  </div>

                  <div className="password-requirements">
                    <div className={`requirement-item ${passwordRequirements.minLength ? "met" : "unmet"}`}>
                      <i className={passwordRequirements.minLength ? "fas fa-check-circle" : "fas fa-circle"} />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`requirement-item ${passwordRequirements.uppercase ? "met" : "unmet"}`}>
                      <i className={passwordRequirements.uppercase ? "fas fa-check-circle" : "fas fa-circle"} />
                      <span>One uppercase letter (A-Z)</span>
                    </div>
                    <div className={`requirement-item ${passwordRequirements.lowercase ? "met" : "unmet"}`}>
                      <i className={passwordRequirements.lowercase ? "fas fa-check-circle" : "fas fa-circle"} />
                      <span>One lowercase letter (a-z)</span>
                    </div>
                    <div className={`requirement-item ${passwordRequirements.number ? "met" : "unmet"}`}>
                      <i className={passwordRequirements.number ? "fas fa-check-circle" : "fas fa-circle"} />
                      <span>One number (0-9)</span>
                    </div>
                    <div className={`requirement-item ${passwordRequirements.special ? "met" : "unmet"}`}>
                      <i className={passwordRequirements.special ? "fas fa-check-circle" : "fas fa-circle"} />
                      <span>One special character (!@#$%^&*)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
              <div className="input-wrapper">
                <i className="fas fa-lock input-icon-left" aria-hidden="true"></i>
                <input
                  type="password"
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  required
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  className={formData.confirmPassword.length > 0 ? (passwordsMatch() ? "valid" : "invalid") : ""}
                />
                {formData.confirmPassword.length > 0 && (
                  <span className={`match-indicator ${passwordsMatch() ? "match" : "mismatch"}`}>
                    {passwordsMatch() ? <i className="fas fa-check-circle" /> : <i className="fas fa-times-circle" />}
                    <span>{passwordsMatch() ? "Passwords match" : "Passwords do not match"}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="form-options terms-wrapper">
              <label className="checkbox-label">
                <input type="checkbox" name="termsAccepted" required />
                <span>I agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</Link> and <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link></span>
              </label>
            </div>

            <button type="submit" className="login-button" disabled={loading || !isFormValid()}>
              {loading ? (<><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Creating Account...</>) : ("Sign Up")}
            </button>

            <div className="divider"><span>or continue with</span></div>

            <button type="button" className="google-button" onClick={handleGoogleSignIn} disabled={loading}>
              <img src="/google.svg" alt="Google" className="google-icon" aria-hidden="true" />
              <span>Continue with Google</span>
            </button>
          </form>

          <p className="register-text">Already have an account? <Link href="/login">Log In</Link></p>
        </div>
      </div>
    </div>
  );
}