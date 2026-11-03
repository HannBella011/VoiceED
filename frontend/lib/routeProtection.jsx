// routeProtection - VoiceED
// Client-side route protection utilities

'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';

export function ProtectedRoute({ children, fallback = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      // Store the intended destination for redirect after login
      const returnUrl = pathname + window.location.search;
      sessionStorage.setItem('shielded_return_url', returnUrl);
      router.push('/login');
    }
  }, [isLoggedIn, isLoading, pathname, router]);

  // Show fallback while loading, or nothing if not authenticated
  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isLoggedIn) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook to check if current route requires authentication
 * and handle the redirect logic.
 */
export function useRouteProtection() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isLoading } = useAuthContext();

  const checkAuthAndRedirect = useCallback(() => {
    if (!isLoading && !isLoggedIn) {
      const returnUrl = pathname + window.location.search;
      sessionStorage.setItem('shielded_return_url', returnUrl);
      router.push('/login');
      return false;
    }
    return true;
  }, [isLoggedIn, isLoading, pathname, router]);

  return { checkAuthAndRedirect, isLoading, isLoggedIn };
}

/**
 * Hook for handling post-login redirect
 */
export function useLoginRedirect() {
  const router = useRouter();

  const redirectAfterLogin = useCallback(() => {
    const returnUrl = sessionStorage.getItem('shielded_return_url');
    if (returnUrl) {
      sessionStorage.removeItem('shielded_return_url');
      router.push(returnUrl);
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  return { redirectAfterLogin };
}

/**
 * Get the stored return URL (for display or conditional logic)
 */
export function getReturnUrl() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('shielded_return_url');
}

/**
 * Clear the stored return URL
 */
export function clearReturnUrl() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('shielded_return_url');
  }
}

/**
 * Hook for navigation that checks auth before navigating
 */
export function useProtectedNavigation() {
  const router = useRouter();
  const { isLoggedIn } = useAuthContext();

  const navigateToService = useCallback((href) => {
    if (isLoggedIn) {
      router.push(href);
    } else {
      sessionStorage.setItem('shielded_return_url', href);
      router.push('/login');
    }
  }, [isLoggedIn, router]);

  return { navigateToService };
}
