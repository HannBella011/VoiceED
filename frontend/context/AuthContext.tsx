// AuthContext - VoiceED
// Authentication context provider using Supabase Auth

"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface Profile {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string | null;
  last_login: string | null;
  gender: string | null;
  birthday: string | null;
  school_id: string | null;
  avatar_url: string | null;
}

interface LoginStats {
  counts: Record<string, number>;
  lastLogin: string | undefined;
}

interface AuthContextType {
  currentUser: Profile | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isLoggedIn: boolean;
  loginStats: LoginStats;
  login: (email: string, password: string) => Promise<Profile>;
  register: (userData: {
    fullName: string;
    displayName: string;
    email: string;
    password: string;
    confirmPassword: string;
    schoolId: string;
    birthday: string;
    termsAccepted: boolean;
  }) => Promise<Profile>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginStats, setLoginStats] = useState<LoginStats>({ counts: {}, lastLogin: undefined });
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Supabase auth listener
  useEffect(() => {
    const initAuth = async () => {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        setSupabaseUser(session.user);
        // Fetch profile from backend
        await fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (session?.user) {
        setSupabaseUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setSupabaseUser(null);
        setCurrentUser(null);
        setIsLoggedIn(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const profile = await response.json();
        setCurrentUser(profile);
        setIsLoggedIn(true);
        
        // Update login stats
        const newLoginStats = { ...loginStats };
        newLoginStats.counts[profile.username] = (newLoginStats.counts[profile.username] || 0) + 1;
        newLoginStats.lastLogin = new Date().toISOString();
        setLoginStats(newLoginStats);
        localStorage.setItem("shielded_login_stats", JSON.stringify(newLoginStats));
      } else {
        setCurrentUser(null);
        setIsLoggedIn(false);
      }
    } catch {
      setCurrentUser(null);
      setIsLoggedIn(false);
    }
  }, [session?.access_token, loginStats]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }

    const data = await response.json();
    
    // Store tokens in localStorage for API calls
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    
    setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: { id: data.user.id, email: data.user.email },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
    } as Session);
    setSupabaseUser({ id: data.user.id, email: data.user.email } as SupabaseUser);
    
    await fetchProfile(data.user.id);
    
    return data.user;
  }, []);

  const register = useCallback(async (userData: {
    fullName: string;
    displayName: string;
    email: string;
    password: string;
    confirmPassword: string;
    schoolId: string;
    birthday: string;
    termsAccepted: boolean;
  }) => {
    // Validation
    if (!userData.fullName || !userData.displayName || !userData.email || !userData.password || !userData.confirmPassword || !userData.schoolId || !userData.birthday) {
      throw new Error("Please fill in all fields");
    }

    if (userData.password !== userData.confirmPassword) {
      throw new Error("Passwords do not match");
    }

    if (userData.password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    if (!userData.termsAccepted) {
      throw new Error("Please accept the Terms of Service and Privacy Policy");
    }

    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: userData.fullName,
        display_name: userData.displayName,
        email: userData.email,
        password: userData.password,
        confirm_password: userData.confirmPassword,
        school_id: userData.schoolId,
        birthday: userData.birthday,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Registration failed");
    }

    const data = await response.json();
    
    // Store tokens
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    
    setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: { id: data.user.id, email: data.user.email },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
    } as Session);
    setSupabaseUser({ id: data.user.id, email: data.user.email } as SupabaseUser);
    
    await fetchProfile(data.user.id);
    
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setCurrentUser(null);
    setSupabaseUser(null);
    setSession(null);
    setIsLoggedIn(false);
    router.push("/");
  }, [router]);

  const updateProfile = useCallback((updates: Partial<Profile>) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        supabaseUser,
        session,
        isLoggedIn,
        loginStats,
        login,
        register,
        logout,
        updateProfile,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}