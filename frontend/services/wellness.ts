// Wellness Service - VoiceED
// Placeholder functions for WellnessED API calls

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

export interface WellnessTip {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateJournalEntryData {
  title: string;
  content: string;
  mood?: string;
}

export interface WellnessFilters {
  page?: number;
  limit?: number;
  category?: string;
}

export const wellnessService = {
  async getTips(category?: string): Promise<WellnessTip[]> {
    const params = category ? `?category=${category}` : '';
    return request(`/wellness/tips${params}`);
  },

  async getResources(): Promise<any[]> {
    return request('/wellness/resources');
  },

  async createJournalEntry(data: CreateJournalEntryData): Promise<JournalEntry> {
    return request('/wellness/journal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getJournalEntries(params?: WellnessFilters): Promise<{ entries: JournalEntry[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return request(`/wellness/journal?${searchParams.toString()}`);
  },

  async getJournalEntry(entryId: string): Promise<JournalEntry> {
    return request(`/wellness/journal/${entryId}`);
  },

  async updateJournalEntry(entryId: string, data: Partial<CreateJournalEntryData>): Promise<JournalEntry> {
    return request(`/wellness/journal/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteJournalEntry(entryId: string): Promise<void> {
    return request(`/wellness/journal/${entryId}`, { method: 'DELETE' });
  },
};

export default wellnessService;