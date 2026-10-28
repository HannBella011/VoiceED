// Reports Service - VoiceED
// Placeholder functions for ReportED API calls

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

export interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'under_review' | 'resolved' | 'rejected';
  is_anonymous: boolean;
  location?: string;
  user_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateReportData {
  title: string;
  description: string;
  category: string;
  is_anonymous?: boolean;
  location?: string;
}

export interface UpdateReportData {
  title?: string;
  description?: string;
  status?: string;
  category?: string;
}

export interface ReportFilters {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
}

export const reportsService = {
  async createReport(data: CreateReportData): Promise<Report> {
    return request<Report>('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getReports(params?: ReportFilters): Promise<{ reports: Report[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return request(`/reports?${searchParams.toString()}`);
  },

  async getReport(reportId: string): Promise<Report> {
    return request(`/reports/${reportId}`);
  },

  async updateReport(reportId: string, data: UpdateReportData): Promise<Report> {
    return request(`/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteReport(reportId: string): Promise<void> {
    return request(`/reports/${reportId}`, { method: 'DELETE' });
  },

  async changeStatus(reportId: string, status: string): Promise<Report> {
    return request(`/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async getMyReports(params?: ReportFilters): Promise<{ reports: Report[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return request(`/reports/my?${searchParams.toString()}`);
  },
};

export default reportsService;