import { createClient } from '@supabase/supabase-js';
// Separate PKCE storage prevents recovery sessions from replacing the app session.
export const recovery = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key',
  {
    auth: {
      flowType: 'pkce',
      storageKey: 'voiceed-password-recovery',
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: false,
    },
  }
);
export async function requestRecovery(email) {
  const { error } = await recovery.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  // Provider errors must not reveal whether an account exists.
  if (error)
    throw new Error('Unable to request recovery right now. Please try again later.');
  return 'If that email is registered, a password reset link will be sent.';
}
