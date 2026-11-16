import { authFetch } from '@/lib/authFetch';
import { submissionKey } from '@/lib/reportSubmission';
// Reports Service - VoiceED
// API calls for ReportED functionality

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

async function requestFormData(endpoint, formData, options = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await authFetch(`${API_BASE_URL}${endpoint}`, {
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

async function submitWizardReport(path, data, files, key, publicSubmission) {
  if (!key) key = await submissionKey(data, files, path);
  if (data.incident_date)
    data = { ...data, incident_date: new Date(data.incident_date).toISOString() };
  const form = new FormData();
  for (const field of [
    'title',
    'description',
    'category',
    'location',
    'incident_date',
    'reporter_email',
  ])
    if (data[field] != null) form.append(field, data[field]);
  if (data.reporter_details)
    form.append('reporter_details', JSON.stringify(data.reporter_details));
  files.forEach((file) => form.append('files', file));
  if (publicSubmission) {
    // Anonymous/guest submissions do not transmit an account token or session cookie.
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Idempotency-Key': key },
      body: form,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        typeof result.detail === 'string'
          ? result.detail
          : 'Unable to submit. Check your entries and try again.'
      );
    return result;
  }
  return requestFormData(path, form, { headers: { 'Idempotency-Key': key } });
}
export async function submitReportAuthenticated(data, files = [], key) {
  return submitWizardReport('/reports/submit', data, files, key, false);
}
export async function submitReportAnonymous(data, files = [], key) {
  const { reporter_details, ...anonymousData } = data;
  return submitWizardReport(
    '/reports/submit/anonymous',
    anonymousData,
    files,
    key,
    true
  );
}
export async function submitReportGuest(data, files = [], key) {
  return submitWizardReport('/reports/submit/guest', data, files, key, true);
}

// ============================================================================
// Public Tracking (No Auth Required)
// ============================================================================

export async function trackReport(trackingCode, accessToken) {
  return request(`/tracking/track/${encodeURIComponent(trackingCode)}`, {
    headers: accessToken ? { 'X-Report-Access': accessToken } : {},
  });
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
  return request('/reports/admin/stats');
}

export async function adminListReports(params) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  return request(`/reports/admin/reports?${searchParams.toString()}`);
}

export async function adminGetReport(reportId) {
  return request(`/reports/admin/reports/${reportId}`);
}

export async function adminUpdateReportStatus(reportId, data) {
  return request(`/reports/admin/reports/${reportId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adminAssignReport(reportId, data) {
  return request(`/reports/admin/reports/${reportId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adminRejectReport(reportId, data) {
  return request(`/reports/admin/reports/${reportId}/reject`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function adminUpdateReport(reportId, data) {
  return request(`/reports/admin/reports/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adminAddTimelineEntry(reportId, status, remarks, attachmentIds) {
  return request(`/reports/admin/reports/${reportId}/timeline`, {
    method: 'POST',
    body: JSON.stringify({
      status,
      remarks: remarks || null,
      attachment_ids: attachmentIds || [],
    }),
  });
}

export async function getAvailableAssignees() {
  return request('/tracking/admin/assignees');
}

export async function adminListUsers(page = 1, limit = 20, role, isActive) {
  const searchParams = new URLSearchParams();
  searchParams.append('page', String(page));
  searchParams.append('limit', String(limit));
  if (role) searchParams.append('role', role);
  if (isActive !== undefined) searchParams.append('is_active', String(isActive));

  return request(`/users/admin?${searchParams.toString()}`);
}

export async function adminGetUser(userId) {
  return request(`/tracking/admin/users/${userId}`);
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
  files.forEach((file) => {
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
