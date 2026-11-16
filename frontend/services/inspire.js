import { authFetch } from '@/lib/authFetch';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function inspireRequest(path, { method = 'GET', data, signal } = {}) {
  const token =
    typeof window === 'undefined' ? null : localStorage.getItem('access_token');
  const form = typeof FormData !== 'undefined' && data instanceof FormData;
  const response = await authFetch(`${API}/inspire${path}`, {
    method,
    signal,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!form && data !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(data === undefined ? {} : { body: form ? data : JSON.stringify(data) }),
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

export const postPath = (post) => `/${post.kind}/${post.record_id}`;
export const postUrl = (post, origin = window.location.origin) =>
  `${origin}/inspire-ed?post=${encodeURIComponent(post.id)}`;

// Preserve the established service/barrel API for existing callers.
export const inspireService = {
  getStories: (params = {}) =>
    inspireRequest(
      `/stories?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined))}`
    ),
  getQuotes: () => inspireRequest('/quotes'),
  createStory: (data) => inspireRequest('/stories', { method: 'POST', data }),
  createQuote: (data) => inspireRequest('/quotes', { method: 'POST', data }),
};
export default inspireService;

export async function shareLink(
  post,
  {
    copy = false,
    loggedIn = false,
    browser = navigator,
    origin = window.location.origin,
    request = inspireRequest,
  } = {}
) {
  const url = postUrl(post, origin);
  let method = 'copy';
  try {
    if (!copy && browser.share) {
      await browser.share({ title: post.content.title || 'InspireED', url });
      method = 'native';
    } else {
      if (!browser.clipboard?.writeText)
        throw new Error(
          'Copy is unavailable. Open the post and copy its address from your browser.'
        );
      await browser.clipboard.writeText(url);
    }
  } catch (error) {
    if (error.name === 'AbortError') return { cancelled: true };
    throw error;
  }
  // Guest shares work too; counts represent authenticated completed actions only.
  let updated = null;
  if (loggedIn) {
    try {
      updated = await request(`${postPath(post)}/shares`, {
        method: 'POST',
        data: { method },
      });
    } catch {
      return { url, method, countPending: true };
    }
  }
  return { url, method, updated };
}
