// Users Service - VoiceED
// Placeholder functions for user profile API calls

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: 'student' | 'admin' | 'moderator';
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface UpdateUserData {
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

export const usersService = {
  async getCurrentUser(): Promise<User> {
    return request('/users/me');
  },

  async updateCurrentUser(data: UpdateUserData): Promise<User> {
    return request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getUser(userId: string): Promise<User> {
    return request(`/users/${userId}`);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return request('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },

  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/users/me/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    
    return response.json();
  },

  async deleteAccount(password: string): Promise<void> {
    return request('/users/me', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  },

  async getUserStats(): Promise<{
    login_count: number;
    last_login: string;
    account_age: string;
  }> {
    return request('/users/me/stats');
  },
};

export default usersService;