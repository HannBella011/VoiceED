// Share Service - VoiceED
// Placeholder functions for ShareED API calls

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

export interface SharedMaterial {
  id: string;
  title: string;
  description?: string;
  subject: string;
  file_url: string;
  file_type: string;
  user_id: string;
  download_count: number;
  created_at: string;
}

export interface CreateMaterialData {
  title: string;
  description?: string;
  subject: string;
  file_url: string;
  file_type: string;
  is_anonymous?: boolean;
}

export interface ShareFilters {
  page?: number;
  limit?: number;
  subject?: string;
  file_type?: string;
}

export const shareService = {
  async getMaterials(params?: ShareFilters): Promise<{ materials: SharedMaterial[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return request(`/share/materials?${searchParams.toString()}`);
  },

  async getMaterial(materialId: string): Promise<SharedMaterial> {
    return request(`/share/materials/${materialId}`);
  },

  async uploadMaterial(data: CreateMaterialData): Promise<SharedMaterial> {
    return request('/share/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteMaterial(materialId: string): Promise<void> {
    return request(`/share/materials/${materialId}`, { method: 'DELETE' });
  },

  async getMyMaterials(params?: ShareFilters): Promise<{ materials: SharedMaterial[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return request(`/share/my-materials?${searchParams.toString()}`);
  },

  async downloadMaterial(materialId: string): Promise<{ download_url: string }> {
    return request(`/share/materials/${materialId}/download`);
  },

  async incrementDownloadCount(materialId: string): Promise<void> {
    return request(`/share/materials/${materialId}/download-count`, { method: 'POST' });
  },

  async getSubjects(): Promise<string[]> {
    return request('/share/subjects');
  },

  async getFileTypes(): Promise<string[]> {
    return request('/share/file-types');
  },
};

export default shareService;