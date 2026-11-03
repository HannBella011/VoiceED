// useAuth - VoiceED
// Authentication hook for managing user state

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginStats, setLoginStats] = useState({ counts: {}, lastLogin: undefined });

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
      const parsed = JSON.parse(savedStats);
      // Handle both old and new format
      if (parsed.counts) {
        setLoginStats(parsed);
      } else {
        // Old format migration
        setLoginStats({ counts: parsed, lastLogin: undefined });
      }
    }
  }, []);

  const login = useCallback(async (username, password) => {
    const users = JSON.parse(localStorage.getItem('shielded_users') || '[]');
    const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    
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
      role: user.role,
      gender: user.gender,
      birthday: user.birthday,
      loginTime: new Date().toISOString(),
    };
    
    localStorage.setItem('shielded_current_user', JSON.stringify(currentUser));
    
    // Update login stats
    const newLoginStats = { 
      counts: { ...loginStats.counts }, 
      lastLogin: new Date().toISOString() 
    };
    newLoginStats.counts[username] = (newLoginStats.counts[username] || 0) + 1;
    localStorage.setItem('shielded_login_stats', JSON.stringify(newLoginStats));
    setLoginStats(newLoginStats);
    
    setCurrentUser(currentUser);
    setIsLoggedIn(true);
    
    return currentUser;
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
    
    // Get existing users
    const users = JSON.parse(localStorage.getItem('shielded_users') || '[]');
    
    // Check if email already exists
    if (users.find((u) => u.email === userData.email)) {
      throw new Error('An account with this email already exists');
    }
    
    // Create new user (password stored separately for demo)
    const newUser = {
      id: Date.now().toString(),
      username: userData.username,
      email: userData.email,
      password: userData.password, // In real app, this would be hashed
      gender: userData.gender,
      birthday: userData.birthday ? `${userData.birthday.month}/${userData.birthday.day}/${userData.birthday.year}` : undefined,
      createdAt: new Date().toISOString(),
      role: 'student',
    };
    
    users.push(newUser);
    localStorage.setItem('shielded_users', JSON.stringify(users));
    
    // Auto-login after registration
    const currentUser = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
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

  const updateProfile = useCallback((updates) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      localStorage.setItem('shielded_current_user', JSON.stringify(updatedUser));
    }
  }, [currentUser]);

  return {
    currentUser,
    isLoggedIn,
    loginStats,
    login,
    register,
    logout,
    updateProfile,
  };
}

export default useAuth;
