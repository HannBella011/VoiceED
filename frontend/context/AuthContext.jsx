// AuthContext - VoiceED
// Authentication context provider

'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { RegisterData } from '@/types';

const AuthContext = createContext(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginStats, setLoginStats] = useState({ counts: {}, lastLogin: undefined });
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount (for immediate UI), then validate with backend
  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('shielded_current_user');
      const savedStats = localStorage.getItem('shielded_login_stats');
      const accessToken = localStorage.getItem('shielded_access_token');
      
      if (savedStats) {
        setLoginStats(JSON.parse(savedStats));
      }
      
      if (savedUser && accessToken) {
        try {
          // Validate token with backend
          const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          
          if (response.ok) {
            const user = await response.json();
            setCurrentUser(user);
            setIsLoggedIn(true);
            
            // Update localStorage with fresh user data
            localStorage.setItem('shielded_current_user', JSON.stringify(user));
          } else {
            // Token invalid, clear auth
            localStorage.removeItem('shielded_current_user');
            localStorage.removeItem('shielded_access_token');
          }
        } catch {
          // Network error, keep local user but mark as potentially stale
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setIsLoggedIn(true);
        }
      }
      
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  const login = useCallback(async (username, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for cookies
      body: JSON.stringify({ username, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed. Please try again.');
    }
    
    const data = await response.json();
    
    // Store access token in localStorage for client-side auth checks
    localStorage.setItem('shielded_access_token', data.access_token);
    localStorage.setItem('shielded_current_user', JSON.stringify(data.user));
    
    // Update login stats
    const newLoginStats = { 
      counts: { ...loginStats.counts }, 
      lastLogin: new Date().toISOString() 
    };
    newLoginStats.counts[username] = (newLoginStats.counts[username] || 0) + 1;
    localStorage.setItem('shielded_login_stats', JSON.stringify(newLoginStats));
    setLoginStats(newLoginStats);
    
    setCurrentUser(data.user);
    setIsLoggedIn(true);
    
    return data.user;
  }, [loginStats]);

  const register = useCallback(async (userData) => {
    // Validation
    if (!userData.username || !userData.email || !userData.password || !userData.confirmPassword) {
      throw new Error('Please fill in all fields');
    }
    
    if (userData.password !== userData.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    if (userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    if (!userData.termsAccepted) {
      throw new Error('Please accept the Terms of Service and Privacy Policy');
    }
    
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        full_name: userData.fullName,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed. Please try again.');
    }
    
    const data = await response.json();
    
    // Store access token
    localStorage.setItem('shielded_access_token', data.access_token);
    localStorage.setItem('shielded_current_user', JSON.stringify(data.user));
    
    setCurrentUser(data.user);
    setIsLoggedIn(true);
    
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    }
    
    localStorage.removeItem('shielded_current_user');
    localStorage.removeItem('shielded_access_token');
    setCurrentUser(null);
    setIsLoggedIn(false);
    router.push('/');
  }, [router]);

  const updateProfile = useCallback((updates) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      localStorage.setItem('shielded_current_user', JSON.stringify(updatedUser));
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{
      currentUser,
      isLoggedIn,
      loginStats,
      login,
      register,
      logout,
      updateProfile,
      isLoading,
    }}>
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
