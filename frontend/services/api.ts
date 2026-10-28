// Frontend API client for VoiceED
// Placeholder for API communication with backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
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

  // Auth
  async login(username: string, password: string) {
    return this.request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async register(data: { username: string; email: string; password: string; full_name?: string }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Users
  async getCurrentUser() {
    return this.request('/users/me');
  }

  async updateCurrentUser(data: Partial<{ email: string; full_name: string; avatar_url: string }>) {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getUser(userId: string) {
    return this.request(`/users/${userId}`);
  }

  // Reports
  async createReport(data: { title: string; description: string; category: string; is_anonymous?: boolean; location?: string }) {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getReports(params?: { page?: number; limit?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return this.request(`/reports?${searchParams.toString()}`);
  }

  async getReport(reportId: string) {
    return this.request(`/reports/${reportId}`);
  }

  async updateReport(reportId: string, data: Partial<{ title: string; description: string; status: string; category: string }>) {
    return this.request(`/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteReport(reportId: string) {
    return this.request(`/reports/${reportId}`, { method: 'DELETE' });
  }

  // Wellness
  async getWellnessTips(category?: string) {
    const params = category ? `?category=${category}` : '';
    return this.request(`/wellness/tips${params}`);
  }

  async getWellnessResources() {
    return this.request('/wellness/resources');
  }

  async createJournalEntry(data: { title: string; content: string; mood?: string }) {
    return this.request('/wellness/journal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getJournalEntries(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return this.request(`/wellness/journal?${searchParams.toString()}`);
  }

  // Inspire
  async getInspireStories(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return this.request(`/inspire/stories?${searchParams.toString()}`);
  }

  async getInspireQuotes() {
    return this.request('/inspire/quotes');
  }

  async createInspireStory(data: { title: string; content: string; author_name?: string; is_anonymous?: boolean }) {
    return this.request('/inspire/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Share
  async getSharedMaterials(params?: { subject?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return this.request(`/share/materials?${searchParams.toString()}`);
  }

  async getMaterial(materialId: string) {
    return this.request(`/share/materials/${materialId}`);
  }

  async uploadMaterial(data: { title: string; description?: string; subject: string; file_url: string; file_type: string }) {
    return this.request('/share/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteMaterial(materialId: string) {
    return this.request(`/share/materials/${materialId}`, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

// React hook for using the API client
import { useState, useEffect } from 'react';

export function useApi() {
  const [client] = useState(apiClient);
  return client;
}