import { authFetch } from '@/lib/authFetch';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
export async function accountRequest(path, method = 'GET', data) {
  const response = await authFetch(`${API}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const body = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof body.detail === 'string'
        ? body.detail
        : `Request failed (${response.status})`
    );
  return body;
}
