// Share Service - VoiceED
// Placeholder functions for ShareED API calls

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function request(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
    return {};
  }

  return response.json();
}

export const shareService = {
  async getMaterials(params) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return request(`/share/materials?${searchParams.toString()}`);
  },

  async getMaterial(materialId) {
    return request(`/share/materials/${materialId}`);
  },

  async uploadMaterial(data) {
    return request('/share/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteMaterial(materialId) {
    return request(`/share/materials/${materialId}`, { method: 'DELETE' });
  },
};

export default shareService;
