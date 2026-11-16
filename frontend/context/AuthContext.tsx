// AuthContext - VoiceED
// Authentication context provider using Supabase Auth

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { authFetch, refreshApiSession } from '@/lib/authFetch';
import { supabase } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  is_verified: boolean | null;
  email_verified?: boolean | null;
  theme: string;
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
  signInWithGoogle: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const authEpoch = useRef(0);
  const isLoggedIn = Boolean(currentUser);
  const [loginStats, setLoginStats] = useState<LoginStats>({
    counts: {},
    lastLogin: undefined,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const themes = ['blue', 'purple', 'red', 'green', 'orange', 'pink'];
    document.body.classList.remove(...themes.map((color) => `${color}-theme`));
    document.body.classList.add(`${currentUser?.theme || 'blue'}-theme`);
  }, [currentUser?.id, currentUser?.theme]);

  const fetchProfile = useCallback(async (accessToken: string) => {
    const epoch = authEpoch.current;
    try {
      const response = await authFetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Unable to load profile');
      const profile = await response.json();
      if (epoch !== authEpoch.current) return null;
      setCurrentUser(profile);
      return profile;
    } catch (error) {
      if (epoch === authEpoch.current) setCurrentUser(null);
      throw error;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const epoch = authEpoch.current;
      try {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (epoch !== authEpoch.current) return;
          setSession(session);
          setSupabaseUser(session?.user ?? null);
        } catch {
          /* API sessions are verified independently of the OAuth cache. */
        }
        const accessToken =
          localStorage.getItem('access_token') || (await refreshApiSession());
        if (epoch === authEpoch.current) await fetchProfile(accessToken);
      } catch {
        // No verified API session: leave protected navigation unavailable.
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
    // Keep Supabase credentials separate from backend API credentials.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        authEpoch.current++;
        setCurrentUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    const expired = () => {
      authEpoch.current++;
      setCurrentUser(null);
      setSupabaseUser(null);
      setSession(null);
    };
    window.addEventListener('voiceed:session-expired', expired);
    return () => window.removeEventListener('voiceed:session-expired', expired);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const epoch = ++authEpoch.current;
      const response = await authFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          Array.isArray(error.detail)
            ? error.detail.map((item: { msg: string }) => item.msg).join('; ')
            : error.detail || 'Login failed'
        );
      }

      const data = await response.json();

      if (epoch !== authEpoch.current)
        throw new Error('Sign-in was interrupted. Please try again.');
      // Store tokens in localStorage for API calls
      localStorage.setItem('access_token', data.access_token);

      localStorage.removeItem('refresh_token');

      const profile = await fetchProfile(data.access_token);
      if (!profile) throw new Error('Sign-in was interrupted. Please try again.');
      return profile;
    },
    [fetchProfile]
  );

  const register = useCallback(
    async (userData: {
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
      if (
        !userData.fullName ||
        !userData.displayName ||
        !userData.email ||
        !userData.password ||
        !userData.confirmPassword ||
        !userData.schoolId ||
        !userData.birthday
      ) {
        throw new Error('Please fill in all fields');
      }

      if (userData.password !== userData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (userData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      if (!userData.termsAccepted) {
        throw new Error('Please accept the Terms of Service and Privacy Policy');
      }

      const response = await authFetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        throw new Error(error.detail || 'Registration failed');
      }

      const data = await response.json();

      return data.user;
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    authEpoch.current++;
    setCurrentUser(null);
    setSupabaseUser(null);
    setSession(null);
    try {
      await authFetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      });
    } catch {
      // Local logout must still complete if the API is unreachable.
    } finally {
      await supabase.auth.signOut().catch(() => undefined);
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setCurrentUser(null);
    setSupabaseUser(null);
    setSession(null);
    router.push('/');
  }, [router]);

  const updateProfile = useCallback(
    (updates: Partial<Profile>) => {
      const owner = currentUser?.id;
      setCurrentUser((previous) =>
        previous && previous.id === owner ? { ...previous, ...updates } : previous
      );
    },
    [currentUser?.id]
  );

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
        signInWithGoogle,
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
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
