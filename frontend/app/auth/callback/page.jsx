'use client';

import { useBlockingLoading } from '@/components/shared/GlobalLoading';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const started = useRef(false);
  const [pending, setPending] = useState(true);
  useBlockingLoading(pending);

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
          process.env.NEXT_PUBLIC_API_URL;
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
    handleAuthCallback().finally(() => setPending(false));
  }, []);

  return null;
}
