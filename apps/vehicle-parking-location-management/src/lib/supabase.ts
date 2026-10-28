import { createClient } from '@supabase/supabase-js';

export const isDemoMode = new URLSearchParams(window.location.search).get('demo') === '1';

export const getAppAuthRedirectUrl = (): string => {
  const url = new URL(window.location.href);
  url.search = isDemoMode ? '?demo=1' : '';
  url.hash = '';
  return url.toString();
};

function validateConfiguration(): { url: string; key: string } | { error: string } {
  const urlVariable = isDemoMode ? 'VITE_DEMO_SUPABASE_URL' : 'VITE_SUPABASE_URL';
  const keyVariable = isDemoMode ? 'VITE_DEMO_SUPABASE_ANON_KEY' : 'VITE_SUPABASE_ANON_KEY';
  const supabaseUrl = (isDemoMode ? import.meta.env.VITE_DEMO_SUPABASE_URL : import.meta.env.VITE_SUPABASE_URL)?.trim();
  const supabasePublishableKey = (isDemoMode ? import.meta.env.VITE_DEMO_SUPABASE_ANON_KEY : import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim();
  if (!supabaseUrl) return { error: `The GitHub Actions variable ${urlVariable} is missing${isDemoMode ? '. Demo mode never connects to production.' : '.'}` };
  if (!supabasePublishableKey) return { error: `The GitHub Actions variable ${keyVariable} is missing${isDemoMode ? '. Demo mode never connects to production.' : '.'}` };

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    return { error: `${urlVariable} is not a valid URL. Use the Project URL from Supabase → Project Settings → API.` };
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return { error: `${urlVariable} must start with https:// and use the Project URL from Supabase.` };
  }
  if (supabasePublishableKey.startsWith('sb_secret_')) {
    return { error: `${keyVariable} contains a secret key. Use the Supabase publishable key instead.` };
  }
  if (!supabasePublishableKey.startsWith('sb_publishable_') && !supabasePublishableKey.startsWith('eyJ')) {
    return { error: `${keyVariable} is not a recognized publishable/anon key. Copy the publishable key from Supabase → Project Settings → API.` };
  }
  return { url: supabaseUrl, key: supabasePublishableKey };
}

const configuration = validateConfiguration();
export const supabaseConfigurationError = 'error' in configuration ? configuration.error : '';
export const isSupabaseConfigured = !supabaseConfigurationError;

export const supabase = 'error' in configuration
  ? null
  : createClient(configuration.url, configuration.key, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
