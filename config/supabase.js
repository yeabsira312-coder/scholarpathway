const { createClient } = require('@supabase/supabase-js');

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!process.env.SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = { supabase };
