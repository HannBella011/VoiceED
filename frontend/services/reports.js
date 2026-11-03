// Reports Service - VoiceED
// API calls for ReportED functionality

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

async function requestFormData(endpoint, formData, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Public Report Submission (Anonymous & Authenticated)
// ============================================================================

export async function submitReportAuthenticated(data, files = []) {
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('description', data.description);
  formData.append('category', data.category ?? '');
  if (data.location) formData.append('location', data.location);
  if (data.incident_date) formData.append('incident_date', data.incident_date);
  if (data.is_anonymous) formData.append('is_anonymous', 'true');
  
  files.forEach(file => {
    formData.append('files', file);
  });
  
  return requestFormData('/reports/submit', formData);
}

export async function submitReportAnonymous(data, files = []) {
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('description', data.description);
  formData.append('category', data.category ?? '');
  if (data.location) formData.append('location', data.location);
  if (data.incident_date) formData.append('incident_date', data.incident_date);
  if (data.reporter_email) formData.append('reporter_email', data.reporter_email);
  
  files.forEach(file => {
    formData.append('files', file);
  });
  
  return requestFormData('/reports/submit/anonymous', formData);
}

// ============================================================================
// Public Tracking (No Auth Required)
// ============================================================================

export async function trackReport(trackingCode) {
  return request(`/tracking/track/${encodeURIComponent(trackingCode)}`);
}

// ============================================================================
// User Dashboard (Authenticated)
// ============================================================================

export async function getMyReports(params) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  return request(`/reports/my?${searchParams.toString()}`);
}

export async function getReport(reportId) {
  return request(`/reports/${reportId}`);
}

// ============================================================================
// Admin Routes
// ============================================================================

export async function getAdminStats() {
  return request('/admin/stats');
}

export async function adminListReports(params) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  return request(`/admin/reports?${searchParams.toString()}`);
}

export async function adminGetReport(reportId) {
  return request(`/admin/reports/${reportId}`);
}

export async function adminUpdateReportStatus(reportId, data) {
  return request(`/admin/reports/${reportId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adminAssignReport(reportId, data) {
  return request(`/admin/reports/${reportId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adminUpdateReport(reportId, data) {
  return request(`/admin/reports/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adminAddTimelineEntry(
  reportId, 
  status, 
  remarks, 
  attachmentIds
) {
  const formData = new FormData();
  formData.append('status', status);
  if (remarks) formData.append('remarks', remarks);
  if (attachmentIds) {
    attachmentIds.forEach(id => formData.append('attachment_ids', String(id)));
  }
  
  return requestFormData(
    `/admin/reports/${reportId}/timeline`, 
    formData
  );
}

export async function getAvailableAssignees() {
  return request('/admin/assignees');
}

export async function adminListUsers(
  page = 1, 
  limit = 20, 
  role, 
  isActive
) {
  const searchParams = new URLSearchParams();
  searchParams.append('page', String(page));
  searchParams.append('limit', String(limit));
  if (role) searchParams.append('role', role);
  if (isActive !== undefined) searchParams.append('is_active', String(isActive));
  
  return request(`/users/admin?${searchParams.toString()}`);
}

export async function adminGetUser(userId) {
  return request(`/users/admin/${userId}`);
}

export async function adminUpdateUser(userId, data) {
  return request(`/users/admin/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adminDeleteUser(userId) {
  return request(`/users/admin/${userId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// File Upload
// ============================================================================

export async function uploadAttachments(reportId, files) {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  
  return requestFormData(`/reports/${reportId}/attachments`, formData);
}

export async function deleteAttachment(attachmentId) {
  return request(`/reports/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Legacy Compatibility
// ============================================================================

export const reportsService = {
  async createReport(data) {
    return request('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getReports(params) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const result = await request(`/reports?${searchParams.toString()}`);
    return { reports: result.items, total: result.total };
  },

  async getReport(reportId) {
    return request(`/reports/${reportId}`);
  },

  async updateReport(reportId, data) {
    return request(`/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteReport(reportId) {
    return request(`/reports/${reportId}`, { method: 'DELETE' });
  },

  async changeStatus(reportId, status) {
    return request(`/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async getMyReports(params) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const result = await request(`/reports/my?${searchParams.toString()}`);
    return { reports: result.items, total: result.total };
  },
};

export default reportsService;
