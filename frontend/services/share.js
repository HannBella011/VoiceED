import { authFetch } from '@/lib/authFetch';
// Share Service - VoiceED
// Database-backed ShareED API calls.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function request(endpoint, options = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await authFetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      Array.isArray(error.detail)
        ? error.detail.map((item) => item.msg).join('; ')
        : error.detail || `HTTP ${response.status}`
    );
  }

  if (response.status === 204) {
    return {};
  }

  return response.json();
}

export const shareService = {
  async getMaterials(params, options = {}) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return request(`/share/materials?${searchParams.toString()}`, options);
  },

  async getMaterial(materialId) {
    return request(`/share/materials/${materialId}`);
  },

  async getSubjects(options = {}) {
    return request('/share/subjects', options);
  },

  async uploadMaterial(data) {
    return request('/share/materials', {
      method: 'POST',
      body: data,
    });
  },

  async recordDownload(materialId) {
    return request(`/share/materials/${materialId}/download`, { method: 'POST' });
  },

  async deleteMaterial(materialId) {
    return request(`/share/materials/${materialId}`, { method: 'DELETE' });
  },
};

export default shareService;
