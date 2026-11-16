import { authFetch } from '@/lib/authFetch';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
async function request(path, { method = 'GET', data, signal } = {}) {
  const token =
    typeof window === 'undefined' ? null : localStorage.getItem('access_token');
  const response = await authFetch(`${API}/admin${path}`, {
    method,
    signal,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(data ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof body.detail === 'string'
        ? body.detail
        : Array.isArray(body.detail)
          ? body.detail.map((item) => item.msg).join('; ')
          : 'Unable to complete the request'
    );
  return body;
}
const params = (values) =>
  new URLSearchParams(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  ).toString();
export const adminService = {
  workload: (options) => request('/workload', options),
  stats: (options) => request('/stats', options),
  content: (values, options) => request(`/content?${params(values)}`, options),
  detail: (kind, id, options) => request(`/content/${kind}/${id}`, options),
  remove: (kind, id, data) =>
    request(`/content/${kind}/${id}/remove`, { method: 'POST', data }),
  audit: (values, options) => request(`/audit?${params(values)}`, options),
  attachment: (id) => request(`/attachments/${id}/access`),
};
