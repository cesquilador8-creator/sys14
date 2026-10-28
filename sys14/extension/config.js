const DEFAULT_SUPABASE_URL = 'https://ghgnmrzzcefkowwehsuy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_A6cRCQI-6LXMXJRqtUBzpg_JNqPzvsg';

const savedSupabaseUrl = localStorage.getItem('SYS14_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
const savedSupabaseAnonKey = localStorage.getItem('SYS14_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;

localStorage.setItem('SYS14_SUPABASE_URL', savedSupabaseUrl);
localStorage.setItem('SYS14_SUPABASE_ANON_KEY', savedSupabaseAnonKey);

const SYS14_EXTENSION_CONFIG = {
  supabaseUrl: savedSupabaseUrl,
  supabaseAnonKey: savedSupabaseAnonKey,
  privacyNotice: 'This extension collects only browsing metadata necessary to apply scheduled website blocking and employee usage summaries on authorized company-managed devices.'
};

window.SYS14_EXTENSION_CONFIG = SYS14_EXTENSION_CONFIG;
