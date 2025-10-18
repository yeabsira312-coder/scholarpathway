const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

let supabase = null;
let isConfigured = false;

if (SUPABASE_URL && SERVICE_KEY) {
  try {
    supabase = createClient(
      SUPABASE_URL,
      SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    isConfigured = true;
    console.log('✅ Supabase connected successfully');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    supabase = null;
    isConfigured = false;
  }
} else {
  console.warn('⚠️  Supabase not configured - using fallback data');
}

module.exports = { supabase, isConfigured };
