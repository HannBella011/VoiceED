'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  username: string;
  email: string;
  gender?: string;
  birthday?: string;
  createdAt?: string;
  loginTime?: string;
}

interface LoginStats {
  [username: string]: number;
  lastLogin?: string;
}

interface AuthContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  loginStats: LoginStats;
  login: (username: string, password: string) => Promise<User>;
  register: (userData: RegisterData) => Promise<User>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  isLoading: boolean;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender?: string;
  birthday?: { month: string; day: string; year: string };
  termsAccepted: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginStats, setLoginStats] = useState<LoginStats>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('shielded_current_user');
    const savedStats = localStorage.getItem('shielded_login_stats');
    
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsLoggedIn(true);
    }
    
    if (savedStats) {
      setLoginStats(JSON.parse(savedStats));
    }
    
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const users = JSON.parse(localStorage.getItem('shielded_users') || '[]');
    const user = users.find((u: User) => u.username.toLowerCase() === username.toLowerCase());
    
    if (!user) {
      throw new Error('Username not found. Please check your username or register for an account.');
    }
    
    if (user.password !== password) {
      throw new Error('Incorrect password. Please try again.');
    }
    
    // Login successful
    const currentUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      gender: user.gender,
      birthday: user.birthday,
      loginTime: new Date().toISOString(),
    };
    
    localStorage.setItem('shielded_current_user', JSON.stringify(currentUser));
    
    // Update login stats
    const newLoginStats = { ...loginStats };
    newLoginStats[username] = (newLoginStats[username] || 0) + 1;
    newLoginStats.lastLogin = new Date().toISOString();
    localStorage.setItem('shielded_login_stats', JSON.stringify(newLoginStats));
    setLoginStats(newLoginStats);
    
    setCurrentUser(currentUser);
    setIsLoggedIn(true);
    
    return currentUser;
  }, [loginStats]);

  const register = useCallback(async (userData: RegisterData) => {
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
    
    // Get existing users
    const users = JSON.parse(localStorage.getItem('shielded_users') || '[]');
    
    // Check if email already exists
    if (users.find((u: User) => u.email === userData.email)) {
      throw new Error('An account with this email already exists');
    }
    
    // Create new user
    const newUser: User = {
      id: Date.now().toString(),
      username: userData.username,
      email: userData.email,
      password: userData.password, // In real app, this would be hashed
      gender: userData.gender,
      birthday: userData.birthday ? `${userData.birthday.month}/${userData.birthday.day}/${userData.birthday.year}` : undefined,
      createdAt: new Date().toISOString(),
    };
    
    users.push(newUser);
    localStorage.setItem('shielded_users', JSON.stringify(users));
    
    // Auto-login after registration
    const currentUser = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      gender: newUser.gender,
      birthday: newUser.birthday,
      loginTime: new Date().toISOString(),
    };
    
    localStorage.setItem('shielded_current_user', JSON.stringify(currentUser));
    setCurrentUser(currentUser);
    setIsLoggedIn(true);
    
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('shielded_current_user');
    setCurrentUser(null);
    setIsLoggedIn(false);
    router.push('/');
  }, [router]);

  const updateProfile = useCallback((updates: Partial<User>) => {
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