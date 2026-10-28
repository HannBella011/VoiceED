// Inspire Service - VoiceED
// Placeholder functions for InspireED API calls

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

export interface InspireStory {
  id: string;
  title: string;
  content: string;
  author_name?: string;
  is_anonymous: boolean;
  user_id?: string;
  created_at: string;
}

export interface InspireQuote {
  id: string;
  quote: string;
  author?: string;
  created_at: string;
}

export interface CreateStoryData {
  title: string;
  content: string;
  author_name?: string;
  is_anonymous?: boolean;
}

export interface CreateQuoteData {
  quote: string;
  author?: string;
}

export interface InspireFilters {
  page?: number;
  limit?: number;
}

export const inspireService = {
  async getStories(params?: InspireFilters): Promise<{ stories: InspireStory[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return request(`/inspire/stories?${searchParams.toString()}`);
  },

  async getStory(storyId: string): Promise<InspireStory> {
    return request(`/inspire/stories/${storyId}`);
  },

  async createStory(data: CreateStoryData): Promise<InspireStory> {
    return request('/inspire/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStory(storyId: string, data: Partial<CreateStoryData>): Promise<InspireStory> {
    return request(`/inspire/stories/${storyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteStory(storyId: string): Promise<void> {
    return request(`/inspire/stories/${storyId}`, { method: 'DELETE' });
  },

  async getQuotes(): Promise<InspireQuote[]> {
    return request('/inspire/quotes');
  },

  async getQuote(quoteId: string): Promise<InspireQuote> {
    return request(`/inspire/quotes/${quoteId}`);
  },

  async createQuote(data: CreateQuoteData): Promise<InspireQuote> {
    return request('/inspire/quotes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getDailyQuote(): Promise<InspireQuote> {
    return request('/inspire/quotes/daily');
  },
};

export default inspireService;