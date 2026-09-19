import { supabase } from './supabase';

export type SupabaseConnectionStatus = {
  connected: boolean;
  error: string | null;
};

/**
 * Performs a read-only reachability check through Supabase Auth.
 *
 * This does not require any database tables and does not create a session.
 */
export async function checkSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  const { error } = await supabase.auth.getSession();

  return {
    connected: !error,
    error: error?.message ?? null,
  };
}
