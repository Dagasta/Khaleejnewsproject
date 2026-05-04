/* ============================================================
   خنساء — auth.js (Supabase-powered)
   ============================================================ */
'use strict';

const PLANS = {
  free:  { id:'free',  name:'Free',  price:{monthly:0,yearly:0},    limits:{articlesPerDay:20, arabicRewrites:3,  hasSearch:false,hasFilters:false,hasMarkets:false,hasEliteRadar:false,hasExport:false} },
  pro:   { id:'pro',   name:'Pro',   price:{monthly:29,yearly:24},   limits:{articlesPerDay:500,arabicRewrites:50, hasSearch:true, hasFilters:true, hasMarkets:true, hasEliteRadar:false,hasExport:true} },
  elite: { id:'elite', name:'Elite', price:{monthly:79,yearly:66},   limits:{articlesPerDay:Infinity,arabicRewrites:Infinity,hasSearch:true,hasFilters:true,hasMarkets:true,hasEliteRadar:true,hasExport:true} }
};

function getUserPlan(profile) {
  if (!profile) return PLANS.free;
  const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0;
  const isTrial = profile.plan === 'free' && trialEndsAt && Date.now() < trialEndsAt;
  if (isTrial) return { ...PLANS.pro, isTrial: true, trialEndsAt };
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
function sb() { return window.KhansaaConfig?.getSupabaseClient(); }

async function getProfile(userId) {
  const { data } = await sb().from('profiles').select('*').eq('id', userId).single();
  return data;
}

async function getCurrentUser() {
  try {
    const client = sb();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    if (!session) return null;
    const profile = await getProfile(session.user.id);
    return profile ? { ...profile, email: session.user.email } : null;
  } catch { return null; }
}

async function signUp(name, email, password) {
  try {
    const { data, error } = await sb().auth.signUp({
      email, password,
      options: { data: { name } }
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: data.user };
  } catch(e) { return { ok: false, error: e.message }; }
}

async function signIn(email, password) {
  try {
    const { data, error } = await sb().auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: data.user };
  } catch(e) { return { ok: false, error: e.message }; }
}

async function signOut() {
  await sb().auth.signOut();
  window.location.href = 'auth.html';
}

async function updateUserPlan(userId, plan, cycle) {
  await sb().from('profiles').update({ plan, billing_cycle: cycle, subscribed_at: new Date().toISOString() }).eq('id', userId);
}

async function trackRewrite(userId) {
  const today = new Date().toISOString().slice(0,10);
  const profile = await getProfile(userId);
  const usedToday = profile?.rewrites_date === today ? (profile.rewrites_today || 0) : 0;
  await sb().from('profiles').update({ rewrites_today: usedToday + 1, rewrites_date: today }).eq('id', userId);
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) { window.location.href = 'auth.html'; return null; }
  return user;
}

window.KhansaaAuth = { PLANS, getUserPlan, canRewrite, getCurrentUser, signUp, signIn, signOut, updateUserPlan, trackRewrite, requireAuth };
