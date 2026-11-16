import { authFetch } from '@/lib/authFetch';
// Wellness Service - VoiceED
// Placeholder functions for WellnessED API calls

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

export const wellnessService = {
  async getTips(category) {
    const params = category ? `?category=${category}` : '';
    return request(`/wellness/tips${params}`);
  },

  async getResources() {
    return request('/wellness/resources');
  },

  async createJournalEntry(data) {
    return request('/wellness/journal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getJournalEntries(params) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return request(`/wellness/journal?${searchParams.toString()}`);
  },
};

export default wellnessService;
