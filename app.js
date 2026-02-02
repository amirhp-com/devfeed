/**
 * ═══════════════════════════════════════════════════
 *  DevFeed — Main Application Logic  (v2)
 * ═══════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /* ─── CORS Proxy list (fallback chain) ─── */
  const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
  ];

  /* ─── DOM refs ─── */
  const $ = id => document.getElementById(id);
  const feed       = $('feed');
  const feedEmpty  = $('feedEmpty');
  const tabsList   = $('tabsList');

  /* ─── State ─── */
  let topics     = [];
  let enabled    = {};
  let sourceOn   = {};
  let currentTab = null;
  let cache      = {};
  let readerPrefs = { font: 'sans', size: 15, bg: '#0f0f12' };

  /* ─── INIT ─── */
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    applyReaderPrefs();
    paintSwatches();
    renderTabs();
    bindPanels();
    bindReader();
    bindReaderModal();
    selectTab(currentTab || topics[0]?.key);
  });

  /* ═══ PERSISTENCE ═══ */
  function loadState () {
    topics = getDefaultTopics();
    try {
      const saved = JSON.parse(localStorage.getItem('devfeed_topics'));
      if (Array.isArray(saved)) saved.forEach(t => { if (!topics.find(x => x.key === t.key)) topics.push(t); });
    } catch (_) {}
    try { const e = JSON.parse(localStorage.getItem('devfeed_enabled'));  if (e) enabled  = e; } catch (_) {}
    try { const s = JSON.parse(localStorage.getItem('devfeed_sourceOn')); if (s) sourceOn = s; } catch (_) {}
    try { const r = JSON.parse(localStorage.getItem('devfeed_reader'));   if (r) readerPrefs = { ...readerPrefs, ...r }; } catch (_) {}

    topics.forEach(t => {
      if (!(t.key in enabled)) enabled[t.key] = true;
      t.sources.forEach(s => { const k = t.key + '__' + s.name; if (!(k in sourceOn)) sourceOn[k] = true; });
    });
  }

  function saveState () {
    const defaults = getDefaultTopics();
    const userAdded = topics.filter(t => !defaults.find(d => d.key === t.key));
    localStorage.setItem('devfeed_topics',   JSON.stringify(userAdded));
    localStorage.setItem('devfeed_enabled',  JSON.stringify(enabled));
    localStorage.setItem('devfeed_sourceOn', JSON.stringify(sourceOn));
  }
  function saveReaderPrefs () { localStorage.setItem('devfeed_reader', JSON.stringify(readerPrefs)); }

  /* ═══ TABS ═══ */
  function renderTabs () {
    tabsList.innerHTML = '';
    topics.forEach(t => {
      if (!enabled[t.key]) return;
      const btn = document.createElement('button');
      btn.className = 'tab' + (currentTab === t.key ? ' active' : '');
      btn.dataset.key = t.key;
      btn.innerHTML = `<span class="tab-dot" style="background:${t.color}"></span><span>${t.icon} ${t.name}</span><span class="tab-count" id="count_${t.key}">…</span>`;
      btn.addEventListener('click', () => selectTab(t.key));
      tabsList.appendChild(btn);
    });
  }

  function selectTab (key) {
    currentTab = key;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.key === key));
    showFeed(key);
  }

  /* ═══ FEED ═══ */
  function showFeed (key) {
    if (cache[key]) { renderCards(cache[key], key); return; }
    renderSkeleton();
    fetchTopic(key).then(articles => {
      cache[key] = articles;
      updateCount(key, articles.length);
      renderCards(articles, key);
    });
  }

  function updateCount (key, n) { const el = $('count_' + key); if (el) el.textContent = n; }

  function renderSkeleton () {
    feed.innerHTML = '';
    feedEmpty.style.display = 'none';
    for (let i = 0; i < 4; i++) {
      feed.insertAdjacentHTML('beforeend', `
        <div class="card skeleton">
          <div class="card-img-wrap"></div>
          <div class="card-body" style="gap:12px;justify-content:center;">
            <div class="skeleton-line" style="width:60%;height:11px;"></div>
            <div class="skeleton-line" style="width:90%;height:14px;"></div>
            <div class="skeleton-line" style="width:85%;height:12px;"></div>
            <div class="skeleton-line" style="width:40%;height:11px;"></div>
          </div>
        </div>`);
    }
  }

  function renderCards (articles, key) {
    feed.innerHTML = '';
    if (!articles.length) { feedEmpty.style.display = 'block'; return; }
    feedEmpty.style.display = 'none';
    const topic = topics.find(t => t.key === key) || {};

    articles.forEach((a, i) => {
      /* cards are <div> now — click opens in-app reader */
      const card = document.createElement('div');
      card.className = 'card';
      card.style.animationDelay = (i * 0.04) + 's';
      card.dataset.link        = a.link || '';
      card.dataset.title       = a.title || '';
      card.dataset.image       = a.image || '';
      card.dataset.sourceName  = a.sourceName || '';
      card.dataset.site        = a.site || '';
      card.dataset.date        = a.date || '';

      const faviconUrl = getFavicon(a.site || a.link);

      card.innerHTML = `
        <div class="card-img-wrap">
          ${a.image
            ? `<img src="${escHtml(a.image)}" alt="" loading="lazy" onerror="this.parentNode.innerHTML='<div class=card-img-placeholder>${topic.icon || '📰'}</div>'" />`
            : `<div class="card-img-placeholder">${topic.icon || '📰'}</div>`}
        </div>
        <div class="card-body">
          <div class="card-meta">
            <img class="meta-favicon" src="${escHtml(faviconUrl)}" alt="" onerror="this.style.display='none'" loading="lazy" />
            <span class="meta-site">${escHtml(a.sourceName || a.site || 'Unknown')}</span>
            <span class="meta-sep">•</span>
            <span>${formatDate(a.date)}</span>
            <span class="meta-tag" style="background:${topic.color}22;color:${topic.color};">${escHtml(topic.name || key)}</span>
          </div>
          <h3 class="card-title">${escHtml(a.title)}</h3>
          <p class="card-desc">${escHtml(a.description)}</p>
          <div class="card-footer">
            <span class="footer-link">Read article →</span>
          </div>
        </div>`;

      card.addEventListener('click', () => openArticleReader(a));
      feed.appendChild(card);
    });
  }

  /* ═══ RSS FETCHER ═══ */
  async function fetchTopic (key) {
    const topic = topics.find(t => t.key === key);
    if (!topic) return [];
    const activeSources = topic.sources.filter(s => sourceOn[key + '__' + s.name] !== false);
    const results = await Promise.all(activeSources.map(s => fetchFeed(s.url, s.name, s.site).catch(() => [])));
    const all = results.flat();
    all.sort((a, b) => (new Date(b.date) - new Date(a.date)) || 0);
    const seen = new Set();
    return all.filter(a => { const k = a.title.toLowerCase().trim(); if (seen.has(k)) return false; seen.add(k); return true; });
  }

  async function fetchFeed (url, sourceName, site) {
    let xml = null;
    for (const proxy of CORS_PROXIES) {
      try {
        const res = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
        if (res.ok) { xml = await res.text(); break; }
      } catch (_) { /* next */ }
    }
    if (!xml) return [];
    return parseFeed(xml, sourceName, site);
  }

  function parseFeed (xml, sourceName, site) {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) return [];
    const items    = doc.querySelectorAll('item, entry');
    const articles = [];

    items.forEach(item => {
      const getText = tag => { const el = item.querySelector(tag); return el ? (el.textContent || '').trim() : ''; };
      const getAttr = (tag, attr) => { const el = item.querySelector(tag); return el ? (el.getAttribute(attr) || '').trim() : ''; };

      let title = getText('title') || 'Untitled';
      let link  = getText('link') || getAttr('link', 'href') || '';
      let date  = getText('pubDate') || getText('published') || getText('updated') || getText('dc\\:date') || '';
      let desc  = getText('description') || getText('summary') || getText('content');
      desc = stripHtml(desc).substring(0, 300);

      let image = getAttr('enclosure', 'url')
        || getAttr('media\\:thumbnail', 'url')
        || getAttr('media\\:content', 'url')
        || getImgFromContent(getText('description') || getText('summary') || getText('content'))
        || '';

      articles.push({ title, link, date, description: desc, image, sourceName, site });
    });
    return articles.slice(0, 12);
  }

  function getImgFromContent (html) {
    if (!html) return '';
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return m ? m[1] : '';
  }

  /* ═══ IN-APP ARTICLE READER ═══ */
  function bindReaderModal () {
    $('readerBack').addEventListener('click', closeArticleReader);
  }

  function openArticleReader (article) {
    const modal = $('readerModal');
    const body  = $('readerBody');
    const meta  = $('readerMeta');
    const extLink = $('readerExtLink');

    extLink.href = article.link || '#';

    // meta row
    const faviconUrl = getFavicon(article.site || article.link);
    meta.innerHTML = `
      <img class="rmeta-favicon" src="${escHtml(faviconUrl)}" alt="" onerror="this.style.display='none'" />
      <span class="rmeta-site">${escHtml(article.sourceName || article.site || 'Unknown')}</span>
      <span class="rmeta-sep">•</span>
      <span class="rmeta-date">${formatDate(article.date)}</span>`;

    // show modal with loading state
    body.innerHTML = `
      <h1 class="reader-title">${escHtml(article.title)}</h1>
      ${article.image ? `<img class="reader-featured-img" src="${escHtml(article.image)}" alt="" onerror="this.style.display='none'" />` : ''}
      <div class="reader-loading"><div class="loader"></div>Fetching full article…</div>`;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // try to fetch the actual page
    fetchArticleContent(article.link).then(html => {
      if (!html) {
        // fallback: show description + link
        body.innerHTML = `
          <h1 class="reader-title">${escHtml(article.title)}</h1>
          ${article.image ? `<img class="reader-featured-img" src="${escHtml(article.image)}" alt="" onerror="this.style.display='none'" />` : ''}
          <div class="reader-fallback">
            <p>${escHtml(article.description || 'No preview available.')}</p>
            <a href="${escHtml(article.link)}" target="_blank" rel="noopener noreferrer" class="reader-ext-link" style="justify-content:center;font-size:15px;">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3h4v4"/><path d="M17 3L8 12"/><path d="M14 10v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>
              Read full article on ${escHtml(article.sourceName || 'original site')}
            </a>
          </div>`;
        return;
      }
      // success: render sanitised content
      body.innerHTML = `
        <h1 class="reader-title">${escHtml(article.title)}</h1>
        ${article.image ? `<img class="reader-featured-img" src="${escHtml(article.image)}" alt="" onerror="this.style.display='none'" />` : ''}
        ${html}`;
    });
  }

  function closeArticleReader () {
    $('readerModal').classList.remove('open');
    document.body.style.overflow = '';
  }

  async function fetchArticleContent (url) {
    if (!url) return null;
    for (const proxy of CORS_PROXIES) {
      try {
        const res = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(12000) });
        if (res.ok) {
          const html = await res.text();
          return extractMainContent(html);
        }
      } catch (_) { /* next */ }
    }
    return null;
  }

  /**
   * Very simple content extractor:
   *  1. Parse HTML
   *  2. Remove scripts / styles / nav / footer / aside / header
   *  3. Try to find <article>, or the longest <div> by text length
   *  4. Sanitise: keep only safe tags & attributes
   */
  function extractMainContent (html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    // kill noisy elements
    ['script','style','noscript','nav','header','footer','aside',
     'iframe','video','audio','canvas','svg',
     '.sidebar','#sidebar','.ad','.ads','.cookie','[class*=cookie]',
     '[class*=popup]','[class*=modal]','[class*=banner]',
     '[class*=nav]','[class*=menu]'
    ].forEach(sel => {
      tmp.querySelectorAll(sel).forEach(el => el.remove());
    });

    // prefer <article>
    let container = tmp.querySelector('article');

    if (!container) {
      // fallback: pick the div with the most text
      let best = null, bestLen = 0;
      tmp.querySelectorAll('div, section, main').forEach(el => {
        const len = (el.textContent || '').trim().length;
        if (len > bestLen && len < 50000) { best = el; bestLen = len; }
      });
      container = best;
    }

    if (!container || (container.textContent || '').trim().length < 60) return null;

    // sanitise: whitelist tags
    const allowed = new Set(['p','div','span','h1','h2','h3','h4','h5','h6',
      'a','strong','em','b','i','u','ul','ol','li','blockquote',
      'pre','code','img','br','hr','table','thead','tbody','tr','th','td','caption','figure','figcaption']);

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
    const toRemove = [];
    while (walker.nextNode()) {
      if (!allowed.has(walker.currentNode.tagName.toLowerCase())) toRemove.push(walker.currentNode);
    }
    toRemove.forEach(el => {
      // move children up before removing
      while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
      el.remove();
    });

    // strip all attributes except src on img and href on a
    container.querySelectorAll('*').forEach(el => {
      const tag = el.tagName.toLowerCase();
      const keep = tag === 'img' ? ['src','alt'] : tag === 'a' ? ['href'] : [];
      [...el.attributes].forEach(attr => { if (!keep.includes(attr.name)) el.removeAttribute(attr.name); });
    });

    // make all links open in new tab
    container.querySelectorAll('a').forEach(a => { a.setAttribute('target','_blank'); a.setAttribute('rel','noopener noreferrer'); });

    // trim empty trailing <p>s
    const ps = container.querySelectorAll('p');
    for (let i = ps.length - 1; i >= 0; i--) {
      if ((ps[i].textContent || '').trim() === '') ps[i].remove();
      else break;
    }

    return container.innerHTML;
  }

  /* ═══ PANELS ═══ */
  function bindPanels () {
    $('btnSettings').addEventListener('click', () => { renderSettingsBody(); openPanel('settingsPanel'); });
    $('settingsClose').addEventListener('click',  () => closePanel('settingsPanel'));
    $('settingsOverlay').addEventListener('click', () => closePanel('settingsPanel'));

    $('btnReader').addEventListener('click',  () => openPanel('readerPanel'));
    $('readerClose').addEventListener('click',  () => closePanel('readerPanel'));
    $('readerOverlay').addEventListener('click', () => closePanel('readerPanel'));
  }

  function openPanel (id) { $(id).classList.add('open'); }
  function closePanel (id) { $(id).classList.remove('open'); }

  /* ═══ SETTINGS BODY ═══ */
  function renderSettingsBody () {
    const body = $('settingsBody');
    let html = '<label class="setting-label">Topics</label><div class="topic-list" id="topicList"></div>';
    html += `<div class="add-topic-wrap"><input type="text" id="newTopicInput" placeholder="e.g. React, Rust, …" /><button id="addTopicBtn">+ Add</button></div>`;
    html += `<button class="refresh-btn" id="refreshBtn"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M13.3 3.7a6 6 0 1 0 .7 3.3"/><path d="M14 1v4h-4"/></svg> Refresh all feeds</button>`;
    html += `<label class="setting-label" style="margin-top:28px;">Default Sources</label><div class="source-group" id="sourceList"></div>`;
    body.innerHTML = html;

    // Topic rows
    const tl = $('topicList');
    topics.forEach(t => {
      const row = document.createElement('div');
      row.className = 'topic-row';
      row.innerHTML = `<span class="t-dot" style="background:${t.color}"></span><span class="t-name">${escHtml(t.icon)} ${escHtml(t.name)}</span><button class="t-toggle ${enabled[t.key] ? 'on' : ''}" data-key="${t.key}"></button>`;
      row.querySelector('.t-toggle').addEventListener('click', function () {
        enabled[t.key] = !enabled[t.key];
        this.classList.toggle('on', enabled[t.key]);
        saveState(); renderTabs(); cache = {};
      });
      tl.appendChild(row);
    });

    // Source checkboxes
    const sl = $('sourceList');
    topics.forEach(t => {
      let group = `<div class="source-group-title" style="color:${t.color};">${t.icon} ${escHtml(t.name)}</div>`;
      t.sources.forEach(s => {
        const k = t.key + '__' + s.name;
        group += `<div class="source-row"><input type="checkbox" id="src_${k}" ${sourceOn[k] !== false ? 'checked' : ''} /><label for="src_${k}">${escHtml(s.name)}</label></div>`;
      });
      sl.insertAdjacentHTML('beforeend', group);
    });
    sl.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', function () { sourceOn[this.id.replace('src_','')] = this.checked; saveState(); cache = {}; });
    });

    $('addTopicBtn').addEventListener('click', addTopic);
    $('newTopicInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTopic(); });
    $('refreshBtn').addEventListener('click', refreshAll);
  }

  function addTopic () {
    const input = $('newTopicInput');
    const raw   = input.value.trim();
    if (!raw) return;
    const name = raw.charAt(0).toUpperCase() + raw.slice(1);
    const key  = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || topics.find(t => t.key === key)) {
      input.style.borderColor = 'var(--accent-orange)';
      setTimeout(() => input.style.borderColor = '', 1200);
      return;
    }
    const colors = ['#7b68ee','#60a5fa','#34d399','#fb923c','#f472b6','#a78bfa','#38bdf8'];
    const emojis = ['📰','💬','🔧','📡','🚀','⚙️','🌟'];
    const idx   = topics.length % colors.length;
    const topic = { name, key, color: colors[idx], icon: emojis[idx],
      sources: [
        { name: name + ' Blog', url: `https://${key}.io/feed/`,      site: `https://${key}.io` },
        { name: name + ' News', url: `https://${key}news.com/feed/`, site: `https://${key}news.com` }
      ]
    };
    topics.push(topic);
    enabled[topic.key] = true;
    topic.sources.forEach(s => { sourceOn[topic.key + '__' + s.name] = true; });
    saveState(); renderTabs(); renderSettingsBody();
    input.value = '';
  }

  async function refreshAll () {
    cache = {};
    const btn = $('refreshBtn');
    btn.style.opacity = '.5'; btn.style.pointerEvents = 'none';
    await Promise.all(topics.filter(t => enabled[t.key]).map(t =>
      fetchTopic(t.key).then(articles => { cache[t.key] = articles; updateCount(t.key, articles.length); })
    ));
    btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
    if (currentTab) renderCards(cache[currentTab] || [], currentTab);
  }

  /* ═══ READER PREFS ═══ */
  function bindReader () {
    document.querySelectorAll('#fontToggle .toggle-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#fontToggle .toggle-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        readerPrefs.font = this.dataset.font;
        applyReaderPrefs(); saveReaderPrefs();
      });
    });

    $('fontSizeSlider').addEventListener('input', function () {
      readerPrefs.size = +this.value;
      applyReaderPrefs(); saveReaderPrefs();
    });

    document.querySelectorAll('.swatch').forEach(sw => {
      sw.addEventListener('click', function () {
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        this.classList.add('active');
        readerPrefs.bg = this.dataset.bg;
        applyReaderPrefs(); saveReaderPrefs();
      });
    });
  }

  function applyReaderPrefs () {
    const root = document.documentElement;
    const body = document.body;

    /* font family → set the CSS custom property that everything inherits */
    const fontMap = { sans: "'DM Sans', sans-serif", serif: "'Fraunces', serif", mono: "'Source Code Pro', monospace" };
    root.style.setProperty('--current-font', fontMap[readerPrefs.font] || fontMap.sans);

    /* font size → set the CSS custom property; body inherits it, children inherit from body */
    root.style.setProperty('--current-size', readerPrefs.size + 'px');

    /* background */
    root.style.setProperty('--bg-primary', readerPrefs.bg);
    body.style.background = readerPrefs.bg;

    /* light / parchment helper classes */
    body.classList.remove('light-mode', 'parchment-mode');
    if (readerPrefs.bg === '#fafafa') body.classList.add('light-mode');
    if (readerPrefs.bg === '#f5f0eb') body.classList.add('parchment-mode');

    /* sync controls */
    if ($('fontSizeSlider'))  $('fontSizeSlider').value = readerPrefs.size;
    if ($('sizePreview'))     $('sizePreview').style.fontSize = readerPrefs.size + 'px';

    document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.bg === readerPrefs.bg));
    document.querySelectorAll('#fontToggle .toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.font === readerPrefs.font));
  }

  /** Paint each swatch circle with its own bg colour so users see it */
  function paintSwatches () {
    document.querySelectorAll('.swatch').forEach(sw => {
      sw.style.backgroundColor = sw.dataset.bg;
    });
  }

  /* ═══ HELPERS ═══ */
  function escHtml (s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function stripHtml (html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }
  function formatDate (d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date)) return d;
    const diff = Date.now() - date;
    if (diff < 3600000)  return Math.max(1, Math.floor(diff/60000)) + 'm ago';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
    if (diff < 172800000) return '1d ago';
    return date.toLocaleDateString(undefined, { month:'short', day:'numeric' });
  }
  function getFavicon (url) {
    try { return new URL(url).origin + '/favicon.ico'; } catch (_) { return ''; }
  }

})();
