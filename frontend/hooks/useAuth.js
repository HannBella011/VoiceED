// All service pages share the backend-backed authentication provider.
'use client';

import { useAuthContext } from '@/context/AuthContext';

export function useAuth() {
  return useAuthContext();
}

export default useAuth;
