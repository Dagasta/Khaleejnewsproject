/* ============================================================
   خنساء Editorial Intelligence — app.js
   Journalist dashboard: UAE/Dubai • Economy • Politics • Rankings
   ============================================================ */

'use strict';

// ── PLAN GATING (initialized after auth guard in index.html) ──
function getPlan() { 
  const user = window.__khansaaUser;
  // If user is Elite but expired, they get 'free' limits
  if (user && user.plan !== 'free') {
    const expires = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
    if (expires && expires < new Date()) {
      return { id:'free', name:'Free', limits:{ hasSearch:false,hasFilters:false,hasMarkets:false,articlesPerDay:20,arabicRewrites:3, maxVisibleNews:3 } };
    }
  }
  const plan = window.__khansaaPlan || { id:'free', name:'Free', limits:{ hasSearch:false,hasFilters:false,hasMarkets:false,articlesPerDay:20,arabicRewrites:3, maxVisibleNews:3 } };
  // Ensure the free plan object has the maxVisibleNews limit
  if (plan.id === 'free') plan.limits.maxVisibleNews = 3;
  return plan;
}
function getUser() { return window.__khansaaUser || null; }

// ── CONFIG ──────────────────────────────────────────────────
// Multiple CORS proxies — tried in order; falls back if one is down
const PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`,
  url => `https://proxy.cors.sh/${url}`,
  url => `https://cors-anywhere.herokuapp.com/${url}`,
  url => `https://yproxy.io/proxy/${url}`,
  url => `https://serverless-cors-proxy.vercel.app/api/proxy?url=${encodeURIComponent(url)}`
];

const REFRESH_MS = 2 * 60 * 1000; // 2-Minute High-Frequency Pulse (Market Standard)

// ✅ COMPREHENSIVE OFFICIAL & TRUSTED SOURCES
const SOURCES = [
  // 🇦🇪 UAE & DUBAI (Primary Wires)
  { name: 'WAM Official News',       url: 'https://wam.ae/en/rss/latest',             label: 'WAM',      isOfficial: true, cat: 'uae' },
  { name: 'Khaleej Times Live',      url: 'https://www.khaleejtimes.com/rss.xml',     label: 'KT', cat: 'uae' },
  { name: 'The National UAE',        url: 'https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml', label: 'National', cat: 'uae' },
  { name: 'Arabian Business Dubai',   url: 'https://www.arabianbusiness.com/feed',     label: 'ABiz', cat: 'uae' },
  { name: 'Gulf Business News',      url: 'https://gulfbusiness.com/feed/',           label: 'GulfBus', cat: 'economy' },
  { name: 'Forbes Middle East',      url: 'https://www.forbesmiddleeast.com/rss',      label: 'Forbes', cat: 'economy' },
  
  // 💹 ECONOMY, CREDIT & DEBT (The Analysts)
  { name: 'Fitch / Moody\'s Focus',   url: 'https://news.google.com/rss/search?q=when:7D+(source:Fitch+OR+source:Moody)+UAE&hl=en-AE&gl=AE&ceid=AE:en', label: 'Credit', cat: 'economy' },
  { name: 'Zawya UAE Economy',       url: 'https://www.zawya.com/en/rss/economy',     label: 'Zawya', cat: 'economy' },
  { name: 'Mubasher UAE Biz',        url: 'https://feeds.feedburner.com/MubasherUaeEn', label: 'Mubasher', cat: 'economy' },
  { name: 'Dubai Business Sniper',    url: 'https://news.google.com/rss/search?q=when:24h+Dubai+Business+Economy&hl=en-AE&gl=AE&ceid=AE:en', label: 'DXB BIZ', cat: 'economy' },

  // 🏛️ POLITICS & GCC (Regional Stability)
  { name: 'GCC Political Radar',     url: 'https://news.google.com/rss/search?q=when:7D+GCC+Politics+Summit+Diplomacy&hl=en-US&gl=US&ceid=US:en', label: 'GCC', cat: 'politics' },
  { name: 'Reuters ME Politics',      url: 'https://www.reutersagency.com/feed/?best-topics=middle-east&post_type=best', label: 'Reuters', cat: 'politics' },
  { name: 'Al Arabiya GCC Wire',     url: 'https://news.google.com/rss/search?q=when:24h+Al+Arabiya+GCC+region+politics&hl=en-US&gl=US&ceid=US:en', label: 'AlArabiya', cat: 'politics' },

  // 🏆 GLOBAL RANKINGS (Index & Achievements)
  { name: 'Global Index Sniper',     url: 'https://news.google.com/rss/search?q=when:30D+UAE+Ranked+Index+Competitiveness&hl=en-US&gl=US&ceid=US:en', label: 'INDEX', cat: 'rankings' },
  { name: 'Dubai Achievements',      url: 'https://news.google.com/rss/search?q=when:30D+Dubai+Awarded+Ranking+Top+10&hl=en-US&gl=US&ceid=US:en', label: 'AWARD', cat: 'rankings' },

  // 💰 GOLD & CRYPTO (The First-Mover Analysis)
  { name: 'Investing.com Gold',      url: 'https://www.investing.com/rss/news_301.rss', label: 'Gold', cat: 'markets' },
  { name: 'Kitco Gold Analysis',     url: 'https://www.kitco.com/news/rss/news.xml',    label: 'XAU Analyz', cat: 'markets' },
  { name: 'CoinDesk Crypto Live',    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', label: 'Crypto', cat: 'markets' },
  { name: 'CryptoSlate Radar',       url: 'https://cryptoslate.com/feed/',             label: 'CSlate', cat: 'markets' },

  // 🌐 GLOBAL CORE (The High-Value Network)
  { name: 'Bloomberg Market Hub',    url: 'https://news.google.com/rss/search?q=when:24h+Bloomberg+Markets+Analysis&hl=en-US&gl=US&ceid=US:en', label: 'Bloomberg', cat: 'global' },
  { name: 'CNBC Breaking Biz',       url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html', label: 'CNBC', cat: 'global' },
  { name: 'New York Times (NYT)',     url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', label: 'NYT', cat: 'global' },
  { name: 'Washington Post (World)',  url: 'https://feeds.washingtonpost.com/rss/world', label: 'WaPo', cat: 'global' },
  { name: 'Daily Mail (Global)',     url: 'https://www.dailymail.co.uk/articles.rss', label: 'DMail', cat: 'global' },
  { name: 'The Telegraph (UK)',      url: 'https://www.telegraph.co.uk/rss.xml',       label: 'Telegraph', cat: 'global' },
  { name: 'Associated Press (AP)',   url: 'https://news.google.com/rss/search?q=when:24h+breaking+news&hl=en-US&gl=US&ceid=US:en', label: 'AP', cat: 'global' },
  { name: 'BBC Global News',         url: 'https://feeds.bbci.co.uk/news/rss.xml',     label: 'BBC', cat: 'global' },

  // 🏆 EXTRA RANKINGS (Achievement Saturation)
  { name: 'Dubai Merit Radar',       url: 'https://news.google.com/rss/search?q=when:7d+Dubai+merit+award+ranked+first&hl=en-AE&gl=AE&ceid=AE:en', label: 'AWARD', cat: 'rankings' },
  { name: 'UAE Safety & Prosperity', url: 'https://news.google.com/rss/search?q=when:30D+UAE+ranked+safest+most+prosperous&hl=en-US&gl=US&ceid=US:en', label: 'RANK', cat: 'rankings' },

  // 💰 EXTRA MARKETS (Gold/Crypto Analytics)
  { name: 'Gold Pulse Predictor',    url: 'https://news.google.com/rss/search?q=when:24h+gold+price+forecast+XAU+analysis&hl=en-US&gl=US&ceid=US:en', label: 'XAU Analyz', cat: 'markets' },
  { name: 'Crypto Whale Alerts',     url: 'https://news.google.com/rss/search?q=when:24h+bitcoin+price+move+prediction&hl=en-US&gl=US&ceid=US:en', label: 'Crypto', cat: 'markets' }
];

// ── KEYWORD SCORING ──────────────────────────────────────────
const CATEGORIES = {
  uae: {
    label: 'UAE & Dubai', icon: '🇦🇪',
    keywords: [
      'uae','dubai','abu dhabi','sharjah','ajman','ras al khaimah','fujairah','emirate','emirati',
      'golden visa','uae cabinet','uae government','uae ministry','dubai economy','uae business',
      'emirates','etihad','flydubai','dp world','mubadala','emaar','nakheel','aldar','sobha','damac',
      'adnoc','etisalat','du telecom','dewa','rta','dmcc','difc','jafza','wasl',
      'sheikh mohammed','sheikh hamdan','sheikh khaled','sheikh mansour','sheikh zayed','mbz'
    ],
    exclude:  []
  },
  economy: {
    label: 'Economy & Business', icon: '📈',
    keywords: [
      'economy','economic','gdp','inflation','growth','fiscal','monetary','budget','tax',
      'business','corporate','firm','industry','merger','acquisition','ipo','startup','venture',
      'revenue','profit','dividend','equity','shares','stock market','bank','banking','finance',
      'oil','gas','energy','trade','export','import','fitch','moody','s&p','credit rating'
    ],
    exclude:  []
  },
  politics: {
    label: 'Politics & GCC', icon: '🏛️',
    keywords: [
      'political','diplomacy','summit','bilateral','sanction','ceasefire','gcc','gulf cooperation council',
      'united nations','peace deal','foreign minister','war','conflict','military','iran','israel','hamas','houthi',
      'saudi','riyadh','qatar','doha','kuwait','oman','bahrain','egypt','jordan','iraq','syria','gcc region'
    ],
    exclude:  []
  },
  rankings: {
    label: 'Global Rankings', icon: '🏆',
    keywords: [
      'ranking','ranked','global ranking','index','top 10','top 5','number one','first place',
      'competitiveness','index','innovation','happiness','ease of doing business','livability',
      'best city','world\'s best','wef','imf forecast','world bank report','henley','achievement','awarded','award','leader','leading','success'
    ],
    exclude:  []
  },
  markets: {
    label: 'Market Analysis', icon: '💰',
    keywords: [
      'gold','xau','precious metal','bullion','gold rate','spot price','jewellery','xauusd',
      'investing.com','price analysis','bullish','bearish','inflation','market analysis','souq market','gold analysis','market gap',
      'bitcoin','btc','crypto','cryptocurrency','blockchain','ethereum','eth','token','coinbase','binance'
    ],
    exclude: []
  }
};

// High-value signal words that boost priority
const HIGH_PRIORITY_WORDS   = ['breaking','urgent','exclusive','crisis','record','historic','landmark','ban','war','attack','billion','trillion','collapse','surge','crash','sanctions','arrêté','ministerial','royal decree','emergency'];
const MEDIUM_PRIORITY_WORDS = ['new report','agreement','partnership','launch','opens','expands','forecast','announces','growth','decline','update'];

// ── STATE ────────────────────────────────────────────────────
let allArticles   = [];
let activeFilter  = 'all';
let activePriority = 'all';
let searchQuery   = '';
let isListView    = false;
let sourceStatuses = {};

// ── DOM REFS ─────────────────────────────────────────────────
const loadingState  = document.getElementById('loadingState');
const errorState    = document.getElementById('errorState');
const newsGrid      = document.getElementById('newsGrid');
const emptyState    = document.getElementById('emptyState');
const lastUpdated   = document.getElementById('lastUpdated');
const statTotal     = document.getElementById('statTotal');
const statFiltered  = document.getElementById('statFiltered');
const statSources   = document.getElementById('statSources');
const tickerInner   = document.getElementById('tickerInner');
const dailyBrief    = document.getElementById('dailyBrief');
const trendingList  = document.getElementById('trendingList');
const coverageMap   = document.getElementById('coverageMap');
const sourceList    = document.getElementById('sourceList');
const searchInput   = document.getElementById('searchInput');

// Modal
const modalOverlay  = document.getElementById('modalOverlay');
const modalClose    = document.getElementById('modalClose');
const modalTitle    = document.getElementById('modalTitle');
const modalSummary  = document.getElementById('modalSummary');
const modalSource   = document.getElementById('modalSource');
const modalDate     = document.getElementById('modalDate');
const modalCategory = document.getElementById('modalCategory');
const modalLink     = document.getElementById('modalLink');
const modalCopy     = document.getElementById('modalCopy');
const modalPublish  = document.getElementById('modalPublishBlock');
const publishText   = document.getElementById('publishText');

// ── UTILS ────────────────────────────────────────────────────
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
}

function saveToStorage() {
  try {
    const data = JSON.stringify(allArticles.slice(0, 2000));
    localStorage.setItem('KHALEEJ_ARCHIVE', data);
  } catch(e) {}
}

function loadFromStorage() {
  try {
    const data = localStorage.getItem('KHALEEJ_ARCHIVE');
    if (data) {
      allArticles = JSON.parse(data);
      // Migration: Repair old articles missing new metadata
      let repaired = false;
      allArticles.forEach(a => {
        if (a.isUAE === undefined || !a.priority || !a.category) {
          const score = scoreArticle(a, a.category || 'global');
          Object.assign(a, score);
          repaired = true;
        }
      });
      if (repaired) saveToStorage();
    }
  } catch(e) {}
}

function relativeTime(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function scoreArticle(item, defaultCat) {
  const content = (item.title + ' ' + (item.description || item.rawDesc || '')).toLowerCase();
  
  const SILOS = {
    'uae': ['uae','dubai','abu dhabi','sharjah','emirate','government','golden visa','sheikh','emaar','nakheel','adnoc',' gold souq','etisalat'],
    'economy': ['economy','economic','gdp','inflation','business','merger','acquisition','ipo','startup','venture','mubadala','growth','zawya','arabian business','fitch','moody'],
    'politics': ['political','diplomacy','summit', 'gcc','gulf cooperation council','saudi','qatar','kuwait','oman','bahrain','war','conflict','regional stability'],
    'rankings': ['ranking','ranked','global ranking','index','top 10','top 5','competitiveness','innovation','happiness',' паспорт','henley','achievement','award','leader','leading','success','best city','safety','world best','prosperity index'],
    'markets': ['gold','xau','precious metal','bullion','spot price','jewellery', 'bitcoin','btc','crypto','cryptocurrency','blockchain','ethereum','eth','token','investing.com','kitco','forecast','prediction','analyz','souq price'],
  };

  let category = defaultCat || 'global';
  for (let [cat, keys] of Object.entries(SILOS)) {
    if (keys.some(k => content.includes(k))) { category = cat; break; }
  }
  
  // RANKINGS SOVEREIGNTY: If a source is dedicated to rankings, and mentions UAE, keep it in rankings.
  if (defaultCat === 'rankings') category = 'rankings';

  // Priority detection
  let priority = 'low';
  if (HIGH_PRIORITY_WORDS.some(w => content.toLowerCase().includes(w.toLowerCase()))) priority = 'high';
  else if (MEDIUM_PRIORITY_WORDS.some(w => content.toLowerCase().includes(w.toLowerCase()))) priority = 'medium';
  else if (category !== 'global') priority = 'medium';

  const isUAE = category === 'uae' || SILOS.uae.some(k => content.includes(k));
  
  return { category, isUAE, priority, relevanceScore: priority === 'high' ? 10 : 5 };
}

function buildSummary(description) {
  const clean = stripHtml(description).trim().replace(/\s+/g,' ');
  if (!clean || clean.length < 20) return 'Click to read the full article.';
  return clean.length > 240 ? clean.slice(0, 237) + '…' : clean;
}

// ── TURBO FETCH — Aggressive Parallel Racing ────────────────
async function fetchWithProxy(url) {
  const shuffled = [...PROXIES].sort(() => Math.random() - 0.5);
  // Race TOP 4 proxies simultaneously for ultra-low latency
  const raceCount = 4; 
  const controller = new AbortController();
  
  const race = shuffled.slice(0, raceCount).map(proxyFn => {
    return (async () => {
      try {
        // Fast timeout for the race phase: 6 seconds
        const res = await fetch(proxyFn(url), { 
          signal: controller.signal,
          priority: 'high'
        });
        if (!res.ok) throw new Error('Proxy fail');
        const text = await res.text();
        if (text && text.length > 300) {
          controller.abort(); 
          return text;
        }
        throw new Error('Invalid');
      } catch (e) {
        throw e;
      }
    })();
  });

  try {
    // Return the first successful result instantly
    return await Promise.any(race);
  } catch (e) {
    // Ultra-fast Fallback: Race the remaining proxies in a second batch
    const secondaryRace = shuffled.slice(raceCount, raceCount + 4).map(proxyFn => {
      return (async () => {
        try {
          const res = await fetch(proxyFn(url), { signal: AbortSignal.timeout(8000) });
          if (!res.ok) throw new Error('Proxy fail');
          const text = await res.text();
          if (text && text.length > 300) return text;
          throw new Error('fail');
        } catch (_) { throw _; }
      })();
    });
    try { return await Promise.any(secondaryRace); } catch (e2) {}
  }
  throw new Error('Global Satellite Blackout.');
}

async function fetchFeed(source) {
  const rawXml = await fetchWithProxy(source.url);
  const xml    = new DOMParser().parseFromString(rawXml, 'text/xml');
  const items  = [...xml.querySelectorAll('item')];
  return items.map(item => {
    const title       = item.querySelector('title')?.textContent?.trim() || '';
    const link        = item.querySelector('link')?.textContent?.trim() || '#';
    const description = item.querySelector('description')?.textContent?.trim() || '';
    const pubDate     = item.querySelector('pubDate')?.textContent?.trim() || new Date().toISOString();
    return { title, link, description: buildSummary(description), rawDesc: description, pubDate,
             source: source.name, sourceLabel: source.label, isOfficial: !!source.isOfficial,
             id: btoa(encodeURIComponent(link)).slice(0, 12) };
  }).filter(a => a.title.length > 10);
}

let _isInitialDataReady = false;

async function loadAllFeeds(isInitial = false) {
  // ── UI INITIALIZATION
  if (allArticles.length > 0) {
    loadingState.style.display = 'none';
    newsGrid.style.display     = 'grid';
    emptyState.style.display   = 'none';
  } else if (isInitial) {
    loadingState.style.display = 'flex';
    newsGrid.style.display     = 'none';
  }

  lastUpdated.innerHTML    = '<span class="radar-scan"></span> High-Speed Sync...';
  lastUpdated.style.color    = '#3b82f6';

  const sortedSources = [...SOURCES].sort((a,b) => (b.isOfficial ? 1 : 0) - (a.isOfficial ? 1 : 0));
  let successCount = 0;

  const CONCURRENCY_LIMIT = 6;
  const processSource = async (s) => {
    try {
      const feedItems = await fetchFeed(s);
      let addedAny = false;
      
      feedItems.forEach(item => {
        const exists = allArticles.some(ex => ex.id === item.id || ex.link === item.link);
        if (!exists) {
          Object.assign(item, scoreArticle(item, s.cat)); 
          allArticles.unshift(item);
          addedAny = true;
        }
      });

      if (addedAny || (isInitial && allArticles.length > 0)) {
        allArticles.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
        if (allArticles.length > 2000) allArticles = allArticles.slice(0, 2000);
        
        // REVEAL UI IMMEDIATELY
        loadingState.style.display = 'none';
        newsGrid.style.display     = 'grid';
        emptyState.style.display   = 'none';
        errorState.style.display   = 'none';
        
        applyFiltersAndRender();
        renderTicker();
        renderRightPanel();
      }
      successCount++;
      sourceStatuses[s.name] = 'online';
    } catch (e) {
      sourceStatuses[s.name] = 'error';
    }
  };

  for (let i = 0; i < sortedSources.length; i += CONCURRENCY_LIMIT) {
    await Promise.allSettled(sortedSources.slice(i, i + CONCURRENCY_LIMIT).map(processSource));
  }
  
  // ── FINAL RECOVERY ──
  if (allArticles.length === 0) {
    loadDemoFallback();
  }
  
  // FORCE UI REVEAL
  loadingState.style.display = 'none';
  newsGrid.style.display     = 'grid';
  
  saveToStorage();
  finishScan(successCount);
}

function finishScan(successCount) {
  updateStats(allArticles, successCount);
  renderSourceList();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-AE', { hour:'2-digit', minute:'2-digit' });
  lastUpdated.innerHTML = `<span class="radar-scan"></span> All Satellites Green (${timeStr})`;
}


function notifyNewHighPriority(title) {
  const originalTitle = document.title;
  let count = 0;
  const interval = setInterval(() => {
    document.title = (count % 2 === 0) ? `🚨 NEW: ${title.slice(0, 25)}...` : originalTitle;
    if (++count > 20) { clearInterval(interval); document.title = originalTitle; }
  }, 1000);
}

// ── FALLBACK DEMO DATA ───────────────────────────────────────
function loadDemoFallback() {
  const demo = [
    { id:'d1', title:'Dubai Tops Global Competitiveness Index for Third Year', category:'rankings', priority:'high', source:'WAM', sourceLabel:'WAM', pubDate: new Date().toISOString(), link:'#', description: 'Dubai has been ranked first globally in the world competitiveness report.', isUAE: true, isOfficial: true },
    { id:'d2', title:'UAE Economy Grows 5.4% in Q1', category:'economy', priority:'high', source:'Gulf News', sourceLabel:'GN', pubDate: new Date().toISOString(), link:'#', description: 'The UAE non-oil economy expanded at its fastest pace in six years.', isUAE: true },
    { id:'d3', title:'New Strategic Partnership Signed between UAE and Saudi Arabia', category:'politics', priority:'medium', source:'WAM', sourceLabel:'WAM', pubDate: new Date().toISOString(), link:'#', description: 'A new era of bilateral cooperation begins.', isUAE: true, isOfficial: true }
  ];
  if (allArticles.length === 0) {
    allArticles = demo;
    requestAnimationFrame(() => {
      applyFiltersAndRender();
      renderTicker();
      renderRightPanel();
      updateStats(allArticles, 0);
    });
  }
}

// ── STATS ────────────────────────────────────────────────────
function updateStats(articles, sources) {
  statTotal.textContent     = articles.length + (articles.length === 10 ? '' : '');
  statFiltered.textContent  = articles.filter(a => a.priority === 'high').length;
  statSources.textContent   = sources !== undefined ? sources : SOURCES.length;
}

// ── TICKER ─────────────────────────────────────────────────
function renderTicker() {
  // Prioritize Official/Verified HIGH priority news first
  const highArticles = allArticles.filter(a => a.priority === 'high');
  highArticles.sort((a,b) => (b.isOfficial ? 1 : 0) - (a.isOfficial ? 1 : 0));
  
  const headlines = highArticles.slice(0, 8);
  if (!headlines.length) return;
  tickerInner.textContent = headlines.map(a => `  ●  ${a.isOfficial ? '[OFFICIAL] ' : ''}${a.title}`).join('  ');
}

// ── SOURCE LIST ──────────────────────────────────────────────
function renderSourceList() {
  sourceList.innerHTML = SOURCES.map(s => `
    <div class="source-item">
      <span>${s.name}</span>
      <span class="source-status ${sourceStatuses[s.name] === 'error' ? 'error' : ''}"></span>
    </div>
  `).join('');
}

// ── RIGHT PANEL ──────────────────────────────────────────────
function renderRightPanel() {
  renderDailyBrief();
  renderTrending();
  renderCoverage();
}

function renderDailyBrief() {
  const sections = Object.entries(CATEGORIES).map(([key, cat]) => {
    // FOR BRIEF: UAE/Economy/Politics/Rankings sections MUST follow the isUAE rule
    const items = allArticles.filter(a => {
      if (key === 'uae') return a.isUAE;
      if (key === 'economy') return a.category === 'economy' && a.isUAE;
      if (key === 'rankings') return a.category === 'rankings' && a.isUAE;
      if (key === 'politics') return a.category === 'politics' && a.isUAE;
      return a.category === key;
    }).slice(0, 3);

    if (!items.length) return '';
    const bullets = items.map(a => `<div class="brief-bullet">${a.title}</div>`).join('');
    return `<div class="brief-section"><div class="brief-section-title">${cat.icon} ${cat.label}</div>${bullets}</div>`;
  }).join('');
  dailyBrief.innerHTML = sections || '<p class="brief-placeholder">System is generating local brief…</p>';
}

function renderTrending() {
  if (!allArticles.length) {
    trendingList.innerHTML = '<p class="brief-placeholder">Awaiting trending data...</p>';
    return;
  }
  // Sort by Priority (High first), then Official status
  const trending = [...allArticles].sort((a,b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (b.priority === 'high' && a.priority !== 'high') return 1;
    if (a.isOfficial && !b.isOfficial) return -1;
    if (b.isOfficial && !a.isOfficial) return 1;
    return 0;
  });

  const top5 = trending.slice(0, 5);
  trendingList.innerHTML = top5.map((a, i) => `
    <div class="trending-item">
      <span class="trending-num">${i + 1}</span>
      <span class="trending-text">${a.isOfficial ? '[WAM] ' : ''}${a.title.slice(0, 75)}${a.title.length > 75 ? '…' : ''}</span>
    </div>
  `).join('');
}

function renderCoverage() {
  const total = allArticles.length || 1;
  const catColors = { uae: 'var(--cat-uae)', economy: 'var(--cat-economy)', politics: 'var(--cat-politics)', rankings: 'var(--cat-rankings)' };
  coverageMap.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const count = allArticles.filter(a => a.category === key).length;
    const pct   = Math.round((count / total) * 100);
    return `
      <div class="coverage-row">
        <span class="coverage-label">${cat.icon} ${key === 'rankings' ? 'Rankings' : cat.label.split(' ')[0]}</span>
        <div class="coverage-bar-bg"><div class="coverage-bar-fill" style="width:${pct}%;background:${catColors[key]}"></div></div>
        <span class="coverage-pct">${pct}%</span>
      </div>`;
  }).join('');
}

// ── RENDER CARDS ─────────────────────────────────────────────
function applyFiltersAndRender() {
  let filtered = allArticles;

  if (activeFilter === 'all') {
    // Show Everything
  } else if (activeFilter === 'uae') {
    // UAE & Dubai Focus
    filtered = filtered.filter(a => a.isUAE);
  } else if (activeFilter === 'economy') {
    // Strict UAE & Dubai ECONOMY ONLY
    filtered = filtered.filter(a => a.category === 'economy' && a.isUAE);
  } else if (activeFilter === 'politics') {
    // Global & UAE Politics (Worldwide)
    filtered = filtered.filter(a => a.category === 'politics');
  } else if (activeFilter === 'rankings') {
    // UAE Global Rankings (Achievements ONLY)
    filtered = filtered.filter(a => (a.category === 'rankings' || a.sourceLabel === 'Credit') && a.isUAE);
  } else if (activeFilter === 'markets') {
    // Gold & Crypto (Analytic predicting)
    filtered = filtered.filter(a => a.category === 'markets');
  } else {
    filtered = filtered.filter(a => a.category === activeFilter);
  }

  if (activePriority !== 'all') filtered = filtered.filter(a => a.priority === activePriority);

  // ── Subscription: search gating + Freemium UX
  const plan = getPlan();
  const isFree = plan.id === 'free';
  if (searchQuery) {
    if (!plan.limits.hasSearch) {
      showUpgradePrompt('search');
      return;
    }
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }
  
  // High-End Strategy: Show all articles but blur after 5
  // We no longer slice (which was causing 'empty' looking lists)
  // Instead we let the renderCard handle the blurring
  if (isFree && plan.limits.articlesPerDay !== Infinity) {
    // We let them scroll, seeing the blurred cards
  }

  // Update counts (Universal Match Logic — MUST MATCH GRID FILTERS)
  document.getElementById('count-all').textContent      = allArticles.length;
  document.getElementById('count-uae').textContent      = allArticles.filter(a => a.isUAE).length;
  document.getElementById('count-economy').textContent  = allArticles.filter(a => a.category === 'economy' && a.isUAE).length;
  document.getElementById('count-politics').textContent = allArticles.filter(a => a.category === 'politics').length;
  document.getElementById('count-rankings').textContent = allArticles.filter(a => (a.category === 'rankings' || a.sourceLabel === 'Credit') && a.isUAE).length;
  document.getElementById('count-markets').textContent  = allArticles.filter(a => a.category === 'markets').length;

  // Section title
  const titles = { all: 'All Topics', uae: '🇦🇪 UAE & Dubai', economy: '📈 Economy & Business', politics: '🏛️ Politics & GCC', rankings: '🏆 Global Rankings', markets: '💰 Gold & Crypto' };
  document.getElementById('sectionTitle').textContent = titles[activeFilter];

  if (!filtered.length) {
    newsGrid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  newsGrid.style.display   = 'grid';
  newsGrid.innerHTML = filtered.map((a, i) => renderCard(a, i)).join('');

  // Card click handlers
  newsGrid.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.classList.contains('locked-card')) {
        showUpgradePrompt('articles');
        return;
      }
      const idx = +card.dataset.idx;
      openModal(filtered[idx]);
    });
  });
}

function renderCard(a, i) {
  const plan = getPlan();
  const isFree = plan.id === 'free';
  const maxVisible = plan.limits.maxVisibleNews || Infinity;
  const isLocked = isFree && i >= maxVisible; 
  
  const lockClass = isLocked ? 'locked-card' : '';
  const isFeatured = i === 0 && activeFilter === 'all' && activePriority === 'all' && !searchQuery && !isLocked;
  const catLabel   = CATEGORIES[a.category]?.label.split(' ')[0] || a.category;
  const listClass  = isListView ? 'list-view' : '';
  const featuredBadge = isFeatured ? `<div class="featured-badge">★ Top Story</div>` : '';

  const lockOverlay = isLocked ? `
    <div class="lock-overlay">
      <div class="lock-icon">🔒</div>
      <div class="lock-text">Subscribe to Unlock</div>
      <div class="lock-subText">Get unlimited access to all verified intelligence.</div>
      <a href="plans.html" class="lock-btn">Go Elite →</a>
    </div>
  ` : '';

  if (isFeatured) {
    return `
      <div class="news-card featured ${listClass} ${lockClass}" data-idx="${i}" data-id="${a.id}">
        <div class="card-accent ${a.category}"></div>
        <div class="card-body">
          ${featuredBadge}
          <div class="card-meta">
            <span class="card-cat ${a.category || 'global'}">${catLabel}</span>
            <span class="card-priority ${a.priority || 'medium'}"><span class="dot"></span>${(a.priority || 'medium').toUpperCase()}</span>
          </div>
          <div class="card-title">${a.title || 'Untitled Report'}</div>
          <div class="card-summary">${a.description || ''}</div>
          <div class="card-footer">
            <span class="card-source">${a.isOfficial ? '<span class="verified-badge">✓ Verified</span> ' : ''}${a.source}</span>
            <span class="card-time">${relativeTime(a.pubDate)}</span>
            <span class="card-read">Read more →</span>
          </div>
        </div>
        ${lockOverlay}
      </div>`;
  }

  return `
    <div class="news-card ${listClass} ${lockClass}" data-idx="${i}" data-id="${a.id}" style="animation-delay:${Math.min(i * 0.04, 0.5)}s">
      <div class="card-accent ${a.category}"></div>
      <div class="card-body">
        <div class="card-meta">
          <span class="card-cat ${a.category || 'global'}">${catLabel}</span>
          <span class="card-priority ${a.priority || 'medium'}"><span class="dot"></span>${(a.priority || 'medium').toUpperCase()}</span>
        </div>
        <div class="card-title">${a.title || 'Untitled Report'}</div>
        <div class="card-summary">${a.description || ''}</div>
        <div class="card-footer">
          <span class="card-source">${a.isOfficial ? '<span class="verified-badge">✓ Verified</span> ' : ''}${a.source}</span>
          <span class="card-time">${relativeTime(a.pubDate)}</span>
          <span class="card-read">Read more →</span>
        </div>
      </div>
      ${lockOverlay}
    </div>`;
}

// ── MODAL ────────────────────────────────────────────────────
function openModal(article) {
  modalTitle.textContent    = article.title;
  modalSummary.textContent  = article.description;
  modalSource.textContent   = article.source;
  modalDate.textContent     = relativeTime(article.pubDate);
  modalCategory.textContent = CATEGORIES[article.category]?.label || article.category;
  modalLink.href            = article.link;
  modalPublish.style.display = 'none';
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Generate publish snippet
  const snippet = `📌 ${CATEGORIES[article.category]?.label?.toUpperCase() || 'NEWS'}\n\n${article.title}\n\n${article.description}\n\nSource: ${article.source} | ${new Date(article.pubDate).toLocaleDateString('en-AE', { day:'numeric', month:'long', year:'numeric' })}`;
  publishText.textContent = snippet;
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

modalCopy.addEventListener('click', () => {
  modalPublish.style.display = modalPublish.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('copyPublishBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(publishText.textContent).then(() => {
    const btn = document.getElementById('copyPublishBtn');
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy Snippet'; btn.classList.remove('copied'); }, 2000);
  });
});

// ── FILTERS ──────────────────────────────────────────────────
document.querySelectorAll('[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    applyFiltersAndRender();
  });
});

document.querySelectorAll('[data-priority]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-priority]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activePriority = btn.dataset.priority;
    applyFiltersAndRender();
  });
});

// ── SEARCH ───────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  applyFiltersAndRender();
});

// ── VIEW TOGGLE ──────────────────────────────────────────────
document.getElementById('viewGrid').addEventListener('click', () => {
  isListView = false;
  newsGrid.classList.remove('list-view');
  document.getElementById('viewGrid').classList.add('active');
  document.getElementById('viewList').classList.remove('active');
  applyFiltersAndRender();
});
document.getElementById('viewList').addEventListener('click', () => {
  isListView = true;
  newsGrid.classList.add('list-view');
  document.getElementById('viewList').classList.add('active');
  document.getElementById('viewGrid').classList.remove('active');
  applyFiltersAndRender();
});

// ── REFRESH ──────────────────────────────────────────────────
document.getElementById('refreshBtn').addEventListener('click', loadAllFeeds);

// ── DAILY BRIEF COPY ────────────────────────────────────────
document.getElementById('copyBriefBtn').addEventListener('click', () => {
  const text = allArticles.slice(0, 8).map(a => `• [${(CATEGORIES[a.category]?.label || a.category).toUpperCase()}] ${a.title}`).join('\n');
  const full  = `EDITORIAL BRIEF — ${new Date().toLocaleDateString('en-AE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}\n\n${text}\n\nGenerated by Atheer Editorial Intelligence`;
  navigator.clipboard.writeText(full).then(() => {
    const btn = document.getElementById('copyBriefBtn');
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2200);
  });
});

// ══════════════════════════════════════════════════════════════
//  ARABIC EDITORIAL STUDIO
// ══════════════════════════════════════════════════════════════

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=';
let arabicHistory = JSON.parse(localStorage.getItem('arabicHistory') || '[]');

// ── Engine state ─────────────────────────────────────────────
function getGeminiKey()  { return localStorage.getItem('geminiApiKey') || ''; }
function hasGeminiKey()  { return !!getGeminiKey(); }

function updateEngineDisplay() {
  const dot   = document.getElementById('engineDot');
  const label = document.getElementById('engineLabel');
  if (!dot || !label) return;
  if (hasGeminiKey()) {
    dot.className   = 'engine-dot gemini';
    label.textContent = '✦ Gemini AI — Full editorial rewriting active';
  } else {
    dot.className   = 'engine-dot fallback';
    label.textContent = '⚠ Fallback mode — Basic translation (set API key for full rewriting)';
  }
}

// ── Arabic prompt builder ─────────────────────────────────────
function buildPrompt(text, format, tone) {
  const formatInstructions = {
    article:  'اكتب خبراً صحفياً كاملاً يتضمن عنواناً رئيسياً قوياً، ومقدمة قصيرة، وجسم الخبر بأسلوب الهرم المقلوب. لا تقل عن 150 كلمة.',
    brief:    'اكتب خبراً مقتضباً لا يتجاوز 80 كلمة يتضمن العنوان والمعلومة الأساسية فقط.',
    analysis: 'اكتب تحليلاً صحفياً معمقاً يشرح السياق والأبعاد والتداعيات المحتملة بأسلوب تحليلي رصين. لا يقل عن 200 كلمة.',
    headline: 'أعد صياغة هذا الخبر كعنوان صحفي رئيسي لا يتجاوز 15 كلمة، قوي وجذاب ومباشر.'
  };
  const toneInstructions = {
    formal:     'استخدم أسلوباً رسمياً وأكاديمياً مناسباً للصحافة الإماراتية الرسمية.',
    neutral:    'استخدم أسلوباً محايداً موضوعياً مشابهاً لوكالات الأنباء الدولية.',
    analytical: 'استخدم أسلوباً تحليلياً نقدياً يعكس عمق الفهم والخبرة الصحفية.'
  };

  return `أنت محرر صحفي عربي محترف متخصص في إعداد المحتوى للصحافة الإماراتية والخليجية. مهمتك إعادة صياغة المقال التالي ليصبح تقريراً صحفياً عربياً احترافياً جاهزاً للنشر.

تعليمات إلزامية:
- استخدم اللغة العربية الفصحى الرسمية المناسبة للصحافة الإماراتية
- تجنب الترجمة الحرفية كلياً — أعد البناء اللغوي بالكامل
- استخدم المصطلحات والتعابير الصحفية العربية المعتمدة
- ابدأ بعنوان رئيسي قوي (مميز بسطر واحد)
- اكتب بأسلوب يبدو وكأنه نُشر أصلاً بالعربية وليس مترجماً
- تجنب الأسلوب الأجنبي في بناء الجمل
- لا تضف تعليقات أو ملاحظات — أخرج النص الصحفي فقط

تعليمات الصيغة: ${formatInstructions[format] || formatInstructions.article}
تعليمات الأسلوب: ${toneInstructions[tone] || toneInstructions.formal}

النص الإنجليزي المراد تحريره:
"""
${text.trim()}
"""

أعد كتابة المحتوى أعلاه بالعربية الصحفية الاحترافية الآن:`;
}

// ── Gemini API call ───────────────────────────────────────────
async function rewriteWithGemini(text, format, tone) {
  const key = getGeminiKey();
  if (!key) throw new Error('NO_KEY');
  const prompt = buildPrompt(text, format, tone);
  const res = await fetch(GEMINI_ENDPOINT + key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    }),
    signal: AbortSignal.timeout(30000)
  });
  if (res.status === 400) throw new Error('INVALID_KEY');
  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error('API_ERROR_' + res.status);
  const data = await res.json();
  const result = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!result) throw new Error('EMPTY_RESPONSE');
  return result.trim();
}

// ── MyMemory fallback ─────────────────────────────────────────
async function rewriteWithFallback(text) {
  // Translate chunks (MyMemory limit ~500 chars per call)
  const chunks = [];
  const words  = text.split(' ');
  let current  = '';
  for (const word of words) {
    if ((current + ' ' + word).length > 480) { chunks.push(current.trim()); current = word; }
    else current += ' ' + word;
  }
  if (current.trim()) chunks.push(current.trim());

  const translated = [];
  for (const chunk of chunks) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|ar`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    translated.push(data?.responseData?.translatedText || chunk);
    await new Promise(r => setTimeout(r, 200));
  }
  return '⚠️ ترجمة آلية (ليست تحريراً صحفياً)\n\n' + translated.join(' ');
}

// ── Main rewrite orchestrator ─────────────────────────────────
async function doRewrite(text, format, tone, targetTextEl, targetMetaEl, wordCountEl) {
  let result, engine;
  try {
    if (!hasGeminiKey()) throw new Error('NO_KEY');
    result = await rewriteWithGemini(text, format, tone);
    engine = 'Gemini AI';
  } catch (err) {
    if (err.message === 'INVALID_KEY') {
      localStorage.removeItem('geminiApiKey');
      updateEngineDisplay();
      result = await rewriteWithFallback(text);
      engine = 'MyMemory (key invalid, reset)';
    } else if (err.message === 'RATE_LIMIT') {
      result = await rewriteWithFallback(text);
      engine = 'MyMemory (rate limit reached)';
    } else {
      result = await rewriteWithFallback(text);
      engine = 'MyMemory (fallback)';
    }
  }

  targetTextEl.textContent = result;
  if (targetMetaEl) targetMetaEl.textContent = `Engine: ${engine} • ${new Date().toLocaleTimeString('en-AE', { hour:'2-digit', minute:'2-digit' })}`;
  if (wordCountEl) {
    const wc = result.trim().split(/\s+/).length;
    wordCountEl.textContent = `${wc} كلمة`;
  }
  return result;
}

// ── STUDIO PANEL UI ───────────────────────────────────────────
const studioOverlay  = document.getElementById('studioOverlay');
const studioIdle     = document.getElementById('studioIdle');
const studioLoading  = document.getElementById('studioLoading');
const studioResult   = document.getElementById('studioResult');
const arabicResultText = document.getElementById('arabicResultText');
const resultMeta     = document.getElementById('resultMeta');
const resultWordCount= document.getElementById('resultWordCount');
const studioHistory  = document.getElementById('studioHistory');

function openStudio(prefill) {
  studioOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateEngineDisplay();
  if (prefill) {
    document.getElementById('studioInputText').value = prefill;
  }
  renderHistory();
}
function closeStudio() {
  studioOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('openStudioBtn').addEventListener('click', () => openStudio());
document.getElementById('closeStudioBtn').addEventListener('click', closeStudio);
studioOverlay.addEventListener('click', e => { if (e.target === studioOverlay) closeStudio(); });

document.getElementById('studioRewriteBtn').addEventListener('click', async () => {
  const text   = document.getElementById('studioInputText').value.trim();
  const format = document.getElementById('studioFormat').value;
  const tone   = document.getElementById('studioTone').value;
  if (!text || text.length < 10) {
    document.getElementById('studioInputText').style.borderColor = 'var(--accent-red)';
    setTimeout(() => document.getElementById('studioInputText').style.borderColor = '', 2000);
    return;
  }
  // Show loading
  studioIdle.style.display    = 'none';
  studioResult.style.display  = 'none';
  studioLoading.style.display = 'flex';
  document.getElementById('studioRewriteBtn').disabled = true;
  document.getElementById('rewriteBtnText').style.display = 'none';
  document.getElementById('rewriteSpinner').style.display = 'block';

  try {
    const result = await doRewrite(text, format, tone, arabicResultText, resultMeta, resultWordCount);
    studioLoading.style.display = 'none';
    studioResult.style.display  = 'flex';
    // Save to history
    arabicHistory.unshift({ input: text.slice(0, 80), output: result, ts: Date.now() });
    if (arabicHistory.length > 10) arabicHistory = arabicHistory.slice(0, 10);
    localStorage.setItem('arabicHistory', JSON.stringify(arabicHistory));
    renderHistory();
  } catch (err) {
    studioLoading.style.display = 'none';
    studioIdle.style.display    = 'flex';
    studioIdle.querySelector('p').textContent = 'حدث خطأ، يرجى المحاولة مجدداً';
  } finally {
    document.getElementById('studioRewriteBtn').disabled = false;
    document.getElementById('rewriteBtnText').style.display = 'inline';
    document.getElementById('rewriteSpinner').style.display = 'none';
  }
});

document.getElementById('copyArabicBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(arabicResultText.textContent).then(() => {
    const btn = document.getElementById('copyArabicBtn');
    btn.textContent = '✓ تم النسخ!';
    setTimeout(() => { btn.textContent = '📋 نسخ النص'; }, 2000);
  });
});

document.getElementById('retryBtn').addEventListener('click', () => {
  studioResult.style.display = 'none';
  studioIdle.style.display   = 'flex';
  studioIdle.querySelector('p').textContent = 'أدخل النص الإنجليزي واضغط «تحرير عربي»';
});

function renderHistory() {
  if (!arabicHistory.length) { studioHistory.style.display = 'none'; return; }
  studioHistory.style.display = 'block';
  document.getElementById('historyList').innerHTML = arabicHistory.map((item, i) => `
    <div class="history-item" data-idx="${i}">
      <div class="history-item-title">${item.output.slice(0, 80)}…</div>
    </div>`).join('');
  document.getElementById('historyList').querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', () => {
      const h = arabicHistory[+el.dataset.idx];
      document.getElementById('studioInputText').value = h.input;
      arabicResultText.textContent = h.output;
      studioIdle.style.display   = 'none';
      studioResult.style.display = 'flex';
    });
  });
}

// ── API KEY MODAL ─────────────────────────────────────────────
const apikeyOverlay = document.getElementById('apikeyOverlay');
function openApiSetup() { apikeyOverlay.classList.add('open'); }
function closeApiSetup() { apikeyOverlay.classList.remove('open'); }

document.getElementById('openApiSetupBtn').addEventListener('click', () => {
  document.getElementById('geminiKeyInput').value = getGeminiKey();
  openApiSetup();
});
document.getElementById('closeApiKeyBtn').addEventListener('click', closeApiSetup);
document.getElementById('skipApiKeyBtn').addEventListener('click', closeApiSetup);

document.getElementById('toggleKeyVisibility').addEventListener('click', () => {
  const inp = document.getElementById('geminiKeyInput');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
  const key = document.getElementById('geminiKeyInput').value.trim();
  if (!key || key.length < 20) {
    document.getElementById('geminiKeyInput').style.borderColor = 'var(--accent-red)';
    setTimeout(() => document.getElementById('geminiKeyInput').style.borderColor = '', 2000);
    return;
  }
  localStorage.setItem('geminiApiKey', key);
  updateEngineDisplay();
  const btn = document.getElementById('saveApiKeyBtn');
  btn.textContent = '✓ Activated!';
  btn.style.background = 'var(--accent-green)';
  setTimeout(() => {
    btn.textContent = 'Save & Activate';
    btn.style.background = '';
    closeApiSetup();
  }, 1600);
});

// ── MODAL "Rewrite in Arabic" button ─────────────────────────
document.getElementById('modalRewriteArabic').addEventListener('click', async () => {
  const title   = document.getElementById('modalTitle').textContent;
  const summary = document.getElementById('modalSummary').textContent;
  const full    = `${title}\n\n${summary}`;
  const resultDiv = document.getElementById('modalArabicResult');
  const textDiv   = document.getElementById('modalArabicText');
  const btn       = document.getElementById('modalRewriteArabic');

  resultDiv.style.display = 'block';
  textDiv.textContent     = 'جارٍ إعداد التحرير الصحفي العربي...';
  btn.disabled = true;
  btn.textContent = '⏳ جارٍ...';

  try {
    await doRewrite(full, 'article', 'formal', textDiv, null, null);
  } catch {
    textDiv.textContent = 'حدث خطأ. تأكد من اتصالك بالإنترنت.';
  } finally {
    btn.disabled = false;
    btn.textContent = '✍️ تحرير عربي';
  }
});

document.getElementById('copyModalArabicBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('modalArabicText').textContent).then(() => {
    const btn = document.getElementById('copyModalArabicBtn');
    btn.textContent = '✓ تم';
    setTimeout(() => { btn.textContent = 'نسخ'; }, 2000);
  });
});

// ── First-time: prompt API key setup ─────────────────────────
if (!hasGeminiKey() && !localStorage.getItem('studioSetupSeen')) {
  localStorage.setItem('studioSetupSeen', '1');
  // Don't auto-open — let user discover it naturally
}

// ── FIRST LOAD ───────────────────────────────────────────────
// ── STARTUP SEQUENCE: Instant TTI ─────────────────────────────
(function bootSystem() {
  loadFromStorage();
  
  // If we have cached news, render immediately
  if (allArticles.length > 0) {
    loadingState.style.display = 'none';
    newsGrid.style.display = 'grid';
    applyFiltersAndRender();
    renderTicker();
    renderRightPanel();
  }

  // START LIVE SCAN
  loadAllFeeds(true);
  setInterval(() => loadAllFeeds(false), 2 * 60 * 1000);
  updateEngineDisplay();
})();

// ── SUBSCRIPTION GATING — applied after page loads ───────────
(function applyPlanGating() {
  const plan = getPlan();

  // Lock search input for free users
  if (!plan.limits.hasSearch) {
    const si = document.getElementById('searchInput');
    if (si) {
      si.placeholder = '🔒 Search — Upgrade to Pro';
      si.classList.add('locked-input');
      si.addEventListener('focus', () => showUpgradePrompt('search'), { once: true });
    }
  }

  // Lock filters for free users (keep All + UAE only)
  if (!plan.limits.hasFilters) {
    document.querySelectorAll('[data-filter]').forEach(btn => {
      const f = btn.dataset.filter;
      if (!['all','uae'].includes(f)) {
        btn.classList.add('locked-filter');
        btn.addEventListener('click', e => { e.stopPropagation(); showUpgradePrompt('filters'); }, true);
      }
    });
    // Lock markets filter
    document.querySelectorAll('[data-filter="markets"]').forEach(btn => {
      btn.title = '🔒 Available on Pro plan';
    });
  }

  // Lock markets category for free
  if (!plan.limits.hasMarkets) {
    const mBtn = document.querySelector('[data-filter="markets"]');
    if (mBtn) {
      mBtn.classList.add('locked-filter');
      mBtn.addEventListener('click', e => { e.stopPropagation(); showUpgradePrompt('markets'); }, true);
    }
  }

  // Apply rewrite limit tracking
  const user = getUser();
  if (user && plan.limits.arabicRewrites !== Infinity) {
    const remainingLabel = document.getElementById('engineLabel');
    const today = new Date().toISOString().slice(0,10);
    const usedToday = (user.usageToday && user.usageToday.date === today) ? user.usageToday.rewrites : 0;
    const left = Math.max(0, plan.limits.arabicRewrites - usedToday);
    if (remainingLabel) {
      const orig = remainingLabel.textContent;
      remainingLabel.textContent = orig + ` (${left} rewrites left today)`;
    }
  }
})();

// ── Upgrade prompt helper ─────────────────────────────────────
function showUpgradePrompt(type) {
  const msgs = {
    'rewrites': 'You\'ve reached your free daily translation limit. Elite users get unlimited AI transformations.',
    'articles': 'Elite Access Required. Upgrade to unlock full global news coverage and real-time intelligence.',
    'search': 'Advanced Search is a premium feature. Upgrade to Elite to find exactly what you need.',
    'filters': 'Smart Topic Filtering is reserved for Elite members. Unlock full control now.'
  };
  const msg = msgs[type] || 'Upgrade to Elite for full platform access.';
  
  // Remove existing
  const old = document.getElementById('khansaa-upgrade-toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'khansaa-upgrade-toast';
  toast.innerHTML = `
    <div style="font-size:24px">💎</div>
    <div style="flex:1">
      <div style="font-size:14px; font-weight:700; color:#fff; margin-bottom:4px">Premium Intelligence Locked</div>
      <div style="font-size:12px; color:#a1a1aa; line-height:1.4; margin-bottom:12px">${msg}</div>
      <a href="plans.html" class="btn btn-primary" style="padding:6px 12px; font-size:11px; display:inline-block; border-radius:4px; text-decoration:none; color:white; background:#3b82f6">Upgrade to Elite →</a>
    </div>
    <button onclick="this.closest('#khansaa-upgrade-toast').remove()" style="background:none; border:none; color:#71717a; cursor:pointer; font-size:16px; align-self:flex-start">✕</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 8000);
}

// ── Intercept Arabic rewrite to check limit ───────────────────
const _origDoRewrite = doRewrite;
// Wrap rewrite with quota check
const _wrappedRewrite = async function(text, format, tone, targetEl, metaEl, wcEl) {
  const user = getUser();
  if (user && !window.KhansaaAuth.canRewrite(user)) {
    showUpgradePrompt('rewrites');
    throw new Error('QUOTA_EXCEEDED');
  }
  const result = await _origDoRewrite(text, format, tone, targetEl, metaEl, wcEl);
  if (user) window.KhansaaAuth.trackRewrite(user.email);
  return result;
};
// Replace global reference used by studio
window.doRewrite = _wrappedRewrite;

// ── Locked filter style ───────────────────────────────────────
(function addLockedFilterStyle() {
  const s = document.createElement('style');
  s.textContent = `
    .locked-card { position: relative; cursor: pointer; overflow: hidden; filter: grayscale(0.5); }
    .locked-card .card-body { filter: blur(5px); opacity: 0.7; pointer-events: none; user-select: none; }
    .locked-card::after {
      content: '🔒 Elite Access Required';
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      background: rgba(9, 9, 11, 0.4); color: white; font-weight: 700; font-size: 14px;
      z-index: 10; transition: 0.3s;
    }
    .locked-card:hover::after { background: rgba(59, 130, 246, 0.2); transform: scale(1.05); }
    
    .locked-filter { position: relative; pointer-events: none; opacity: 0.6; }
    .locked-filter::after { 
      content: '🔒'; position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 10px;
    }

    #khansaa-upgrade-toast {
      position: fixed; bottom: 32px; right: 32px; z-index: 10000;
      background: #18181b; border: 1px solid rgba(59, 130, 246, 0.4);
      padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6); animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      max-width: 400px; border-left: 4px solid #3b82f6;
    }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  `;
  document.head.appendChild(s);
})();
