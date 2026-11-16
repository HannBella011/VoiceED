// Renew only the API session; Supabase OAuth tokens remain separate.
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
let renewal;
export async function refreshApiSession() {
  if (!renewal)
    renewal = fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          if ([401, 403].includes(response.status)) {
            localStorage.removeItem('access_token');
            if (typeof window !== 'undefined')
              window.dispatchEvent?.(new Event('voiceed:session-expired'));
          }
          throw new Error('Your session expired. Please sign in again.');
        }
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        return data.access_token;
      })
      .finally(() => {
        renewal = null;
      });
  return renewal;
}
export async function authFetch(url, options = {}) {
  const originalToken =
    typeof window === 'undefined' ? null : localStorage.getItem('access_token');
  const response = await fetch(url, { ...options, credentials: 'include' });
  if (
    response.status !== 401 ||
    (typeof window !== 'undefined' &&
      localStorage.getItem('access_token') !== originalToken) ||
    typeof window === 'undefined' ||
    !localStorage.getItem('access_token') ||
    /\/auth\/(login|register|callback|refresh|reset-password)/.test(String(url))
  )
    return response;
  try {
    const token = await refreshApiSession();
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });
  } catch {
    return response;
  }
}
