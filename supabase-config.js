/* ============================================================
   خنساء — Supabase Configuration
   ============================================================ */
'use strict';

const SUPABASE_URL  = 'https://gnavcnhwsvbrwttivxfh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduYXZjbmh3c3Zicnd0dGl2eGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NzY4MTEsImV4cCI6MjA5MzQ1MjgxMX0.DDb-PDMgPEXyS2lsbmo1pBH8MKIEfOrtld3LQleOgsM';

// Ziina Payment Gateway (UAE)
const ZIINA_API_KEY         = 'MXArml8Tc7aSO+m1KMcmDPLO20scOEaL1YnLs/xA4ACH49nouFNxjP0wUprwQsR2';
const ZIINA_PUBLISHABLE_KEY = 'sb_publishable_0fRwQXwa_h7gtxR3vG6XqA_WgHexNAz';
const ZIINA_API_BASE        = 'https://api-sandbox.ziina.com/api';

// Pricing in AED fils (1 AED = 100 fils)
const ZIINA_PRICES = {
  pro:   { monthly: 10600, yearly: 106000 },   // 106 AED / 1060 AED
  elite: { monthly: 29000, yearly: 290000 }    // 290 AED / 2900 AED
};

// Initialize Supabase client (requires Supabase CDN loaded first)
function getSupabaseClient() {
  if (window._sbClient) return window._sbClient;
  if (!window.supabase) {
    console.error('Supabase CDN not loaded');
    return null;
  }
  window._sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  return window._sbClient;
}

window.KhansaaConfig = { SUPABASE_URL, SUPABASE_ANON, ZIINA_API_KEY, ZIINA_PUBLISHABLE_KEY, ZIINA_API_BASE, ZIINA_PRICES, getSupabaseClient };
