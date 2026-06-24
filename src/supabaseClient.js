import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

if (!supabase) {
  console.warn('[Supabase] Missing environment variables VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. Global High Score feature is disabled.');
}
