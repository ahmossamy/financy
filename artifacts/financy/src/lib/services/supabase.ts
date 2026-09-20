import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qjknubujqebzcbahpfjb.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'missing-publishable-key';

/**
 * Shared browser client for Financy.
 *
 * GitHub Pages builds can start without the publishable key configured.
 * In that case the client stays available so the UI can render and
 * gracefully fall back to demo data. Authenticated Supabase features
 * become active as soon as VITE_SUPABASE_PUBLISHABLE_KEY is provided
 * to the deployment environment.
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
