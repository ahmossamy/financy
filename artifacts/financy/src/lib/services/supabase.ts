import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'VITE_SUPABASE_URL is not configured. Add it to the project environment before starting Financy.',
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    'VITE_SUPABASE_PUBLISHABLE_KEY is not configured. Add it to the project environment before starting Financy.',
  );
}

/**
 * Shared browser client for Financy.
 *
 * Supabase Authentication is enabled and the session is persisted
 * in the browser so the user remains signed in.
 */
export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  },
);
