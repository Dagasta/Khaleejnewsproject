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
  if (defaultCat === 'rankings') category = 'rankings';
  let priority = 'low';
  if (HIGH_PRIORITY_WORDS.some(w => content.toLowerCase().includes(w.toLowerCase()))) priority = 'high';
  else if (MEDIUM_PRIORITY_WORDS.some(w => content.toLowerCase().includes(w.toLowerCase()))) priority = 'medium';
  else if (category !== 'global') priority = 'medium';
  const isUAE = category === 'uae' || SILOS.uae.some(k => content.includes(k));
  return { category, priority, isUAE };
}

function buildSummary(html) {
  const text = stripHtml(html).trim();
  if (text.length > 280) return text.slice(0, 277) + '...';
  return text || 'Analysis pending satellite uplink...';
}

// ── TURBO FETCH — Aggressive Parallel Racing ────────────────
async function fetchWithProxy(url) {
  // Use a simple, robust parallel fetch logic
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const race = PROXIES.slice(0, 4).map(proxyFn => {
    return fetch(proxyFn(url), { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('fail');
        return res.text();
      });
  });

  try {
    const result = await Promise.any(race);
    clearTimeout(timeout);
    return result;
  } catch (e) {
    // Failover
    const fallback = PROXIES.slice(4, 7).map(proxyFn => {
      return fetch(proxyFn(url), { signal: AbortSignal.timeout(10000) })
        .then(res => res.ok ? res.text() : Promise.reject());
    });
    return await Promise.any(fallback);
  }
}

async function fetchFeed(source) {
  try {
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
  } catch(e) { return []; }
}

async function loadAllFeeds(isInitial = false) {
  if (allArticles.length > 0) {
    loadingState.style.display = 'none';
    newsGrid.style.display     = 'grid';
  } else if (isInitial) {
    loadingState.style.display = 'flex';
    newsGrid.style.display     = 'none';
  }

  lastUpdated.innerHTML = '<span class="radar-scan"></span> Syncing Newsroom...';
  
  const sortedSources = [...SOURCES].sort((a,b) => (b.isOfficial ? 1 : 0) - (a.isOfficial ? 1 : 0));
  let successCount = 0;
  const CONCURRENCY = 6;

  for (let i = 0; i < sortedSources.length; i += CONCURRENCY) {
    const batch = sortedSources.slice(i, i + CONCURRENCY);
    await Promise.allSettled(batch.map(async s => {
      const items = await fetchFeed(s);
      if (items.length > 0) successCount++;
      items.forEach(item => {
        if (!allArticles.some(x => x.id === item.id)) {
          Object.assign(item, scoreArticle(item, s.cat));
          allArticles.unshift(item);
        }
      });
      allArticles.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
      if (allArticles.length > 2000) allArticles = allArticles.slice(0, 2000);
      
      if (allArticles.length > 0) {
        loadingState.style.display = 'none';
        newsGrid.style.display     = 'grid';
        applyFiltersAndRender();
        renderTicker();
      }
    }));
  }
  
  if (allArticles.length === 0) loadDemoFallback();
  saveToStorage();
  finishScan(successCount);
}

function finishScan(successCount) {
  updateStats(allArticles, successCount);
  renderSourceList();
  const timeStr = new Date().toLocaleTimeString('en-AE', { hour:'2-digit', minute:'2-digit' });
  lastUpdated.innerHTML = `<span class="radar-scan"></span> Live Dashboard Active (${timeStr})`;
}

function loadDemoFallback() {
  const demo = [
    { id:'d1', title:'Dubai Tops Global Competitiveness Index for Third Year', category:'rankings', priority:'high', source:'WAM', sourceLabel:'WAM', pubDate: new Date().toISOString(), link:'#', description: 'Dubai has been ranked first globally in the world competitiveness report.', isUAE: true, isOfficial: true },
    { id:'d2', title:'UAE Economy Grows 5.4% in Q1', category:'economy', priority:'high', source:'Gulf News', sourceLabel:'GN', pubDate: new Date().toISOString(), link:'#', description: 'The UAE non-oil economy expanded at its fastest pace in six years.', isUAE: true },
    { id:'d3', title:'New Strategic Partnership Signed between UAE and Saudi Arabia', category:'politics', priority:'medium', source:'WAM', sourceLabel:'WAM', pubDate: new Date().toISOString(), link:'#', description: 'A new era of bilateral cooperation begins.', isUAE: true, isOfficial: true }
  ];
  allArticles = demo;
  applyFiltersAndRender();
}

function updateStats(articles, sources) {
  statTotal.textContent = articles.length;
  statFiltered.textContent = articles.filter(a => a.priority === 'high').length;
  statSources.textContent = sources || 0;
}

function renderTicker() {
  const high = allArticles.filter(a => a.priority === 'high').slice(0, 8);
  if (!high.length) return;
  tickerInner.textContent = high.map(a => `  ●  ${a.title}`).join('  ');
}

function renderSourceList() {
  sourceList.innerHTML = SOURCES.slice(0, 12).map(s => `
    <div class="source-item">
      <span>${s.label}</span>
      <span class="source-status ${sourceStatuses[s.name] === 'error' ? 'error' : ''}"></span>
    </div>`).join('');
}

function applyFiltersAndRender() {
  let filtered = allArticles;
  if (activeFilter === 'uae') filtered = filtered.filter(a => a.isUAE);
  else if (activeFilter !== 'all') filtered = filtered.filter(a => a.category === activeFilter);
  
  if (activePriority !== 'all') filtered = filtered.filter(a => a.priority === activePriority);

  const plan = getPlan();
  if (searchQuery && plan.limits.hasSearch) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }

  newsGrid.innerHTML = filtered.map((a, i) => renderCard(a, i)).join('');
  
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
  
  renderRightPanel();
}

function renderCard(a, i) {
  const plan = getPlan();
  const maxVisible = plan.limits.maxVisibleNews || Infinity;
  const isLocked = plan.id === 'free' && i >= maxVisible; 
  const lockClass = isLocked ? 'locked-card' : '';
  const isFeatured = i === 0 && activeFilter === 'all' && !isLocked;
  const catLabel = CATEGORIES[a.category]?.label.split(' ')[0] || a.category;
  
  const lockOverlay = isLocked ? `
    <div class="lock-overlay">
      <div class="lock-icon">🔒</div>
      <div class="lock-text">Subscribe to Unlock</div>
      <a href="plans.html" class="lock-btn">Go Elite →</a>
    </div>` : '';

  return `
    <div class="news-card ${isFeatured ? 'featured' : ''} ${lockClass}" data-idx="${i}">
      <div class="card-accent ${a.category}"></div>
      <div class="card-body">
        <div class="card-meta">
          <span class="card-cat ${a.category}">${catLabel}</span>
          <span class="card-priority ${a.priority}"><span class="dot"></span>${a.priority.toUpperCase()}</span>
        </div>
        <div class="card-title">${a.title}</div>
        <div class="card-summary">${a.description}</div>
        <div class="card-footer">
          <span class="card-source">${a.source}</span>
          <span class="card-time">${relativeTime(a.pubDate)}</span>
        </div>
      </div>
      ${lockOverlay}
    </div>`;
}

function openModal(a) {
  modalTitle.textContent = a.title;
  modalSummary.textContent = a.description;
  modalSource.textContent = a.source;
  modalDate.textContent = new Date(a.pubDate).toLocaleString();
  modalCategory.textContent = a.category.toUpperCase();
  modalLink.href = a.link;
  modalOverlay.classList.add('open');
}

modalClose.addEventListener('click', () => modalOverlay.classList.remove('open'));

function renderRightPanel() {
  const high = allArticles.filter(a => a.priority === 'high').slice(0, 5);
  trendingList.innerHTML = high.map((a, i) => `
    <div class="trending-item">
      <span class="trending-num">${i+1}</span>
      <span class="trending-text">${a.title}</span>
    </div>`).join('');
  
  const total = allArticles.length || 1;
  coverageMap.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const count = allArticles.filter(a => a.category === key).length;
    const pct = Math.round((count / total) * 100);
    return `
      <div class="coverage-row">
        <span class="coverage-label">${cat.icon} ${key.toUpperCase()}</span>
        <div class="coverage-bar-bg"><div class="coverage-bar-fill" style="width:${pct}%"></div></div>
        <span class="coverage-pct">${pct}%</span>
      </div>`;
  }).join('');
}

// ── BOOT SYSTEM ─────────────────────────────────────────────
(function boot() {
  loadFromStorage();
  if (allArticles.length > 0) {
    loadingState.style.display = 'none';
    newsGrid.style.display = 'grid';
    applyFiltersAndRender();
    renderTicker();
  }
  loadAllFeeds(true);
  setInterval(() => loadAllFeeds(false), REFRESH_MS);
})();

// ── EVENT LISTENERS ─────────────────────────────────────────
document.querySelectorAll('[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    applyFiltersAndRender();
  });
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  applyFiltersAndRender();
});

document.getElementById('refreshBtn').addEventListener('click', () => loadAllFeeds(false));

function showUpgradePrompt(type) {
  alert("Upgrade to Elite to unlock " + type);
}
