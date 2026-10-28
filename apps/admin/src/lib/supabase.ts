import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.SUPABASE_URL) as string | undefined;
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.SUPABASE_ANON_KEY
) as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. Configure VITE_SUPABASE_URL and one of VITE_SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY.');
}

export const supabase = createClient(supabaseUrl ?? 'https://placeholder.supabase.co', supabaseAnonKey ?? 'placeholder-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const getMissingConfigMessage = () =>
  'Supabase is not configured. Set VITE_SUPABASE_URL and the publishable/anon key in your environment before running MINDLOCK.';
