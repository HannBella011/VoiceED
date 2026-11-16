import { authFetch } from '@/lib/authFetch';
// Users Service - VoiceED
// Placeholder functions for user profile API calls

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function request(endpoint, options = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await authFetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {};
  }

  return response.json();
}

export const usersService = {
  async getCurrentUser() {
    return request('/users/me');
  },

  async updateCurrentUser(data) {
    return request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getUser(userId) {
    return request(`/users/${userId}`);
  },

  async changePassword(currentPassword, newPassword) {
    return request('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  },

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await authFetch(`${API_BASE_URL}/users/me/avatar`, {
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

  async deleteAccount(password) {
    return request('/users/me', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  },

  async getUserStats() {
    return request('/users/me/stats');
  },
};

export default usersService;
