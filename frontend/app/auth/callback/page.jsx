'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const handleAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const requestedNext = params.get('next') || '/dashboard';
      const next =
        requestedNext.startsWith('/') &&
        !requestedNext.startsWith('//') &&
        !requestedNext.includes('\\')
          ? requestedNext
          : '/dashboard';
      try {
        const oauthError = params.get('error_description') || params.get('error');
        if (oauthError) throw new Error(oauthError);
        // Initialization automatically exchanges the PKCE code exactly once.
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session)
          throw new Error('Authentication failed. Please sign in again.');
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const response = await fetch(`${apiBase}/auth/callback`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ provider: 'google' }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            typeof result.detail === 'string'
              ? result.detail
              : 'Unable to finish Google sign-in.'
          );
        localStorage.setItem('access_token', result.access_token);

        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('shielded_return_url');
        window.location.replace(
          result.profile_complete
            ? next
            : `/complete-profile?next=${encodeURIComponent(next)}`
        );
      } catch (err) {
        window.location.replace(
          `/login?error=${encodeURIComponent(err instanceof Error ? err.message : 'Authentication failed')}`
        );
      }
    };
    handleAuthCallback();
  }, []);

  return (
    <div
      className="login-page"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div className="login-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="login-card-header">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <h2>Completing Sign In</h2>
          <p>Please wait while we finish signing you in...</p>
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
        </div>
      </div>
    </div>
  );
}
