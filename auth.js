/* ============================================================
   خنساء — auth.js (Supabase-powered)
   ============================================================ */
'use strict';

const PLANS = {
  free:  { id:'free',  name:'Free',  price:{monthly:0,yearly:0},    limits:{articlesPerDay:20, arabicRewrites:3,  hasSearch:false,hasFilters:false,hasMarkets:false,hasExport:false} },
  pro:   { id:'elite', name:'Elite', price:{monthly:10,yearly:50},  limits:{articlesPerDay:Infinity,arabicRewrites:Infinity,hasSearch:true,hasFilters:true,hasMarkets:true,hasExport:true} }, // Legacy support
  elite: { id:'elite', name:'Elite', price:{monthly:10,yearly:50},  limits:{articlesPerDay:Infinity,arabicRewrites:Infinity,hasSearch:true,hasFilters:true,hasMarkets:true,hasExport:true} }
};

function getUserPlan(profile) {
  if (!profile) return PLANS.free;
  return PLANS[profile.plan] || PLANS.free;
}

function canRewrite(profile) {
  const plan = getUserPlan(profile);
  if (plan.limits.arabicRewrites === Infinity) return true;
  const today = new Date().toISOString().slice(0,10);
  const used = (profile.rewrites_date === today) ? (profile.rewrites_today || 0) : 0;
  return used < plan.limits.arabicRewrites;
}

/* ── Supabase helpers ──────────────────────────────────────── */
function sb() { 
  const client = window.KhansaaConfig?.getSupabaseClient();
  if (!client) console.error("Supabase client is NOT initialized. Check config.");
  return client; 
}

async function getProfile(userId) {
  const client = sb();
  if (!client) return null;
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).single();
  if (error) console.warn("Profile fetch warning:", error.message);
  return data;
}

async function getCurrentUser() {
  try {
    const client = sb();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    if (!session) return null;
    
    let profile = await getProfile(session.user.id);
    
    // Auto-retry if profile trigger hasn't finished yet (common after signup)
    if (!profile) {
      await new Promise(r => setTimeout(r, 1200));
      profile = await getProfile(session.user.id);
    }
    
    // If STILL no profile, return a safe fallback so they don't get logged out
    if (!profile) {
      profile = { id: session.user.id, plan: 'free' };
    }
    
    return { ...profile, email: session.user.email };
  } catch (e) { 
    console.error("Auth Error:", e);
    return null; 
  }
}

async function signUp(name, email, password) {
  try {
    const client = sb();
    const { data, error } = await client.auth.signUp({
      email, password,
      options: { data: { name } }
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: data.user };
  } catch(e) { return { ok: false, error: e.message }; }
}

async function signIn(email, password) {
  try {
    const client = sb();
    if (!client) return { ok: false, error: 'System not initialized' };
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: data.user };
  } catch(e) { return { ok: false, error: e.message }; }
}

async function signOut() {
  await sb().auth.signOut();
  window.location.href = 'auth.html';
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) { 
    if (!window.location.pathname.includes('auth.html')) {
      window.location.href = 'auth.html'; 
    }
    return null; 
  }
  return user;
}

async function updateUserPlan(userId, plan, cycle) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  
  await sb().from('profiles').update({ 
    plan, 
    billing_cycle: cycle, 
    subscribed_at: new Date().toISOString(),
    trial_ends_at: expiresAt.toISOString()
  }).eq('id', userId);
}

async function trackRewrite(userId) {
  const today = new Date().toISOString().slice(0,10);
  const profile = await getProfile(userId);
  const usedToday = profile?.rewrites_date === today ? (profile.rewrites_today || 0) : 0;
  await sb().from('profiles').update({ rewrites_today: usedToday + 1, rewrites_date: today }).eq('id', userId);
}

function isSubscriptionValid(profile) {
  if (!profile) return false;
  if (profile.plan === 'free') return true; 
  if (!profile.trial_ends_at) return false;
  
  const now = new Date();
  const expiry = new Date(profile.trial_ends_at);
  return expiry > now;
}

// Export global object
window.KhansaaAuth = { 
  PLANS, 
  getUserPlan, 
  canRewrite, 
  getCurrentUser, 
  signUp, 
  signIn, 
  signOut, 
  updateUserPlan, 
  trackRewrite, 
  requireAuth, 
  isSubscriptionValid 
};
