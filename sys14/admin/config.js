(function () {
  const defaultUrl = 'https://ghgnmrzzcefkowwehsuy.supabase.co';
  const defaultAnonKey = 'sb_publishable_A6cRCQI-6LXMXJRqtUBzpg_JNqPzvsg';

  const url = localStorage.getItem('SYS14_SUPABASE_URL') || defaultUrl;
  const anonKey = localStorage.getItem('SYS14_SUPABASE_ANON_KEY') || defaultAnonKey;

  localStorage.setItem('SYS14_SUPABASE_URL', url);
  localStorage.setItem('SYS14_SUPABASE_ANON_KEY', anonKey);

  window.__SUPABASE_CONFIG__ = {
    url,
    anonKey,
  };
})();
