import { authFetch } from '@/lib/authFetch';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
async function request(path, { method = 'GET', data, signal } = {}) {
  const token =
    typeof window === 'undefined' ? null : localStorage.getItem('access_token');
  const response = await authFetch(`${API}/super${path}`, {
    method,
    signal,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(data ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.detail;
    const error = new Error(
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.msg).join('; ')
          : detail?.message || 'Account operation failed'
    );
    error.operationId = detail?.operation_id;
    throw error;
  }
  return body;
}
const query = (values) =>
  new URLSearchParams(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  ).toString();
export const superService = {
  workloads: (values, options) => request(`/workloads?${query(values)}`, options),
  stats: (options) => request('/stats', options),
  users: (values, options) => request(`/users?${query(values)}`, options),
  detail: (id, options) => request(`/users/${id}`, options),
  invite: (data) => request('/users/invite', { method: 'POST', data }),
  update: (id, data) => request(`/users/${id}`, { method: 'PATCH', data }),
  status: (id, data) => request(`/users/${id}/status`, { method: 'POST', data }),
  verify: (id, data) => request(`/users/${id}/verification`, { method: 'POST', data }),
  audit: (values, options) => request(`/audit?${query(values)}`, options),
  moderation: (values, options) => request(`/moderation?${query(values)}`, options),
  retry: (id) => request(`/actions/${id}/retry`, { method: 'POST' }),
  recover: (id, data) =>
    request(`/actions/${id}/recover-invitation`, { method: 'POST', data }),
};
