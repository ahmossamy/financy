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
 * Shared browser client for future Supabase-backed features.
 *
 * Only the publishable key is used here. Authentication is not enabled by
 * Financy yet, so sessions are not persisted or refreshed by this client.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});
