// LoginModal - VoiceED
// Login form modal component matching base implementation

"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useLoginRedirect } from "@/lib/routeProtection";

export function LoginModal({ 
  isOpen, 
  onClose, 
  onSwitchToRegister, 
  onSwitchToForgotPassword 
}) {
  const { login, signInWithGoogle } = useAuthContext();
  const { redirectAfterLogin } = useLoginRedirect();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setEmail("");
      setPassword("");
      setError("");
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      setError("");
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await login(email, password);
      onClose?.();
      redirectAfterLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="loginModal" className={"modal " + (isOpen ? "show" : "")}>
      <div className="modal-content">
        <span className="close-button" onClick={onClose}>&times;</span>
        <h2>Login</h2>
        
        {/* Google Sign-In Button */}
        <div className="social-login-divider">
          <span>or continue with</span>
        </div>
        <button
          type="button"
          className="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
        >
          <img src="/google.svg" alt="Google" className="google-icon" />
          <span>Sign in with Google</span>
        </button>
        <div className="divider-line">
          <hr />
        </div>

        <form id="loginForm" onSubmit={handleSubmit}>
          {error && <div className="error-message" role="alert">{error}</div>}
          <div className="input-group">
            <input
              type="email"
              id="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
            />
            <i className="fas fa-envelope"></i>
          </div>
          <div className="input-group">
            <input
              type="password"
              id="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            <i className="fas fa-lock"></i>
          </div>
          <div className="options">
            <label>
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToForgotPassword?.(); onClose(); }}>
              Forgot Password?
            </a>
          </div>
          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
          <p className="register-text">
            Don't have an account?{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToRegister?.(); onClose(); }}>
              Register
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginModal;
