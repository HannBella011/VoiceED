import { authFetch } from '@/lib/authFetch';
// Frontend API client for VoiceED
// Placeholder for API communication with backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await authFetch(`${this.baseUrl}${endpoint}`, {
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

  // Auth
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Users
  async getCurrentUser() {
    return this.request('/users/me');
  }

  async updateCurrentUser(data) {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getUser(userId) {
    return this.request(`/users/${userId}`);
  }

  // Reports
  async createReport(data) {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getReports(params) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return this.request(`/reports?${searchParams.toString()}`);
  }

  async getReport(reportId) {
    return this.request(`/reports/${reportId}`);
  }

  async updateReport(reportId, data) {
    return this.request(`/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteReport(reportId) {
    return this.request(`/reports/${reportId}`, { method: 'DELETE' });
  }

  // Wellness
  async getWellnessTips(category) {
    const params = category ? `?category=${category}` : '';
    return this.request(`/wellness/tips${params}`);
  }

  async getWellnessResources() {
    return this.request('/wellness/resources');
  }

  async createJournalEntry(data) {
    return this.request('/wellness/journal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getJournalEntries(params) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return this.request(`/wellness/journal?${searchParams.toString()}`);
  }

  // Inspire
  async getInspireStories(params) {
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

  async createInspireStory(data) {
    return this.request('/inspire/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Share
  async getSharedMaterials(params) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return this.request(`/share/materials?${searchParams.toString()}`);
  }

  async getMaterial(materialId) {
    return this.request(`/share/materials/${materialId}`);
  }

  async uploadMaterial(data) {
    return this.request('/share/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteMaterial(materialId) {
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
