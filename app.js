/**
 * ═══════════════════════════════════════════════════
 *  DevFeed — Main Application Logic
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
  const feed        = $('feed');
  const feedEmpty   = $('feedEmpty');
  const tabsList    = $('tabsList');

  /* ─── State ─── */
  let topics      = [];      // full topic definitions
  let enabled     = {};      // { topicKey: true/false }
  let sourceOn    = {};      // { topicKey__sourceName: true/false }
  let currentTab  = null;
  let cache       = {};      // { topicKey: [articles] }
  let readerPrefs = { font: 'sans', size: 15, bg: '#0f0f12' };

  /* ─── INIT ─── */
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    applyReaderPrefs();
    renderTabs();
    bindPanels();
    bindReader();
    selectTab(currentTab || topics[0]?.key);
  });

  /* ═══ PERSISTENCE ═══ */
  function loadState () {
    topics = getDefaultTopics();

    // Merge any user-added topics from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('devfeed_topics'));
      if (Array.isArray(saved)) {
        saved.forEach(t => { if (!topics.find(x => x.key === t.key)) topics.push(t); });
      }
    } catch (e) { /* ignore */ }

    // Enabled flags
    try {
      const e = JSON.parse(localStorage.getItem('devfeed_enabled'));
      if (e) enabled = e;
    } catch (_) {}

    // Source-level on/off
    try {
      const s = JSON.parse(localStorage.getItem('devfeed_sourceOn'));
      if (s) sourceOn = s;
    } catch (_) {}

    // Reader prefs
    try {
      const r = JSON.parse(localStorage.getItem('devfeed_reader'));
      if (r) readerPrefs = { ...readerPrefs, ...r };
    } catch (_) {}

    // Defaults: every topic & source ON
    topics.forEach(t => {
      if (!(t.key in enabled)) enabled[t.key] = true;
      t.sources.forEach(s => {
        const k = t.key + '__' + s.name;
        if (!(k in sourceOn)) sourceOn[k] = true;
      });
    });
  }

  function saveState () {
    // Only user-added topics (not in defaults)
    const defaults = getDefaultTopics();
    const userAdded = topics.filter(t => !defaults.find(d => d.key === t.key));
    localStorage.setItem('devfeed_topics',    JSON.stringify(userAdded));
    localStorage.setItem('devfeed_enabled',   JSON.stringify(enabled));
    localStorage.setItem('devfeed_sourceOn',  JSON.stringify(sourceOn));
  }

  function saveReaderPrefs () {
    localStorage.setItem('devfeed_reader', JSON.stringify(readerPrefs));
  }

  /* ═══ TABS ═══ */
  function renderTabs () {
    tabsList.innerHTML = '';
    topics.forEach(t => {
      if (!enabled[t.key]) return;
      const btn = document.createElement('button');
      btn.className = 'tab' + (currentTab === t.key ? ' active' : '');
      btn.dataset.key = t.key;
      btn.innerHTML = `
        <span class="tab-dot" style="background:${t.color}"></span>
        <span>${t.icon} ${t.name}</span>
        <span class="tab-count" id="count_${t.key}">…</span>
      `;
      btn.addEventListener('click', () => selectTab(t.key));
      tabsList.appendChild(btn);
    });
  }

  function selectTab (key) {
    currentTab = key;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.key === key));
    showFeed(key);
  }

  /* ═══ FEED DISPLAY ═══ */
  function showFeed (key) {
    if (cache[key]) {
      renderCards(cache[key], key);
      return;
    }
    renderSkeleton();
    fetchTopic(key).then(articles => {
      cache[key] = articles;
      updateCount(key, articles.length);
      renderCards(articles, key);
    });
  }

  function updateCount (key, n) {
    const el = $('count_' + key);
    if (el) el.textContent = n;
  }

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
    if (!articles.length) {
      feedEmpty.style.display = 'block';
      return;
    }
    feedEmpty.style.display = 'none';
    const topic = topics.find(t => t.key === key) || {};
    articles.forEach((a, i) => {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = a.link || '#';
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.style.animationDelay = (i * 0.04) + 's';

      // Favicon
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
            <span class="footer-link">Read full article →</span>
          </div>
        </div>`;
      feed.appendChild(card);
    });
  }

  /* ═══ RSS FETCHER ═══ */
  async function fetchTopic (key) {
    const topic = topics.find(t => t.key === key);
    if (!topic) return [];

    const activeSources = topic.sources.filter(s => sourceOn[key + '__' + s.name] !== false);
    const promises = activeSources.map(s => fetchFeed(s.url, s.name, s.site).catch(() => []));
    const results  = await Promise.all(promises);
    const all      = results.flat();

    // Sort newest first
    all.sort((a, b) => (new Date(b.date) - new Date(a.date)) || 0);

    // Dedupe by title
    const seen = new Set();
    return all.filter(a => {
      const k = a.title.toLowerCase().trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  async function fetchFeed (url, sourceName, site) {
    let xml = null;

    for (const proxy of CORS_PROXIES) {
      try {
        const res = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
        if (res.ok) { xml = await res.text(); break; }
      } catch (_) { /* try next proxy */ }
    }

    if (!xml) return [];
    return parseFeed(xml, sourceName, site);
  }

  function parseFeed (xml, sourceName, site) {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) return [];

    const items = doc.querySelectorAll('item, entry');
    const articles = [];

    items.forEach(item => {
      const getText = tag => {
        const el = item.querySelector(tag);
        return el ? (el.textContent || '').trim() : '';
      };
      const getAttr = (tag, attr) => {
        const el = item.querySelector(tag);
        return el ? (el.getAttribute(attr) || '').trim() : '';
      };

      let title = getText('title') || 'Untitled';
      let link  = getText('link') || getAttr('link', 'href') || '';
      let date  = getText('pubDate') || getText('published') || getText('updated') || getText('dc\\:date') || '';
      let desc  = getText('description') || getText('summary') || getText('content');

      // Strip HTML from description
      desc = stripHtml(desc).substring(0, 300);

      // Extract image: look in enclosure, media:thumbnail, og-style, or from desc HTML
      let image = getAttr('enclosure', 'url')
        || getAttr('media\\:thumbnail', 'url')
        || getAttr('media\\:content', 'url')
        || getImgFromContent(getText('description') || getText('summary') || getText('content'))
        || '';

      articles.push({ title, link, date, description: desc, image, sourceName, site });
    });

    return articles.slice(0, 12); // limit per source
  }

  function getImgFromContent (html) {
    if (!html) return '';
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return m ? m[1] : '';
  }

  /* ═══ PANELS ═══ */
  function bindPanels () {
    // Settings
    $('btnSettings').addEventListener('click', () => {
      renderSettingsBody();
      openPanel('settingsPanel');
    });
    $('settingsClose').addEventListener('click',  () => closePanel('settingsPanel'));
    $('settingsOverlay').addEventListener('click', () => closePanel('settingsPanel'));

    // Reader
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
    html += `<div class="add-topic-wrap">
               <input type="text" id="newTopicInput" placeholder="e.g. React, Rust, …" />
               <button id="addTopicBtn">+ Add</button>
             </div>`;
    html += `<button class="refresh-btn" id="refreshBtn">
               <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M13.3 3.7a6 6 0 1 0 .7 3.3"/><path d="M14 1v4h-4"/></svg>
               Refresh all feeds
             </button>`;
    html += `<label class="setting-label" style="margin-top:28px;">Default Sources</label>
             <div class="source-group" id="sourceList"></div>`;
    body.innerHTML = html;

    // Topic rows
    const tl = $('topicList');
    topics.forEach(t => {
      const row = document.createElement('div');
      row.className = 'topic-row';
      row.innerHTML = `
        <span class="t-dot" style="background:${t.color}"></span>
        <span class="t-name">${escHtml(t.icon)} ${escHtml(t.name)}</span>
        <button class="t-toggle ${enabled[t.key] ? 'on' : ''}" data-key="${t.key}"></button>`;
      row.querySelector('.t-toggle').addEventListener('click', function () {
        enabled[t.key] = !enabled[t.key];
        this.classList.toggle('on', enabled[t.key]);
        saveState();
        renderTabs();
        cache = {}; // clear cache when sources change
      });
      tl.appendChild(row);
    });

    // Source checkboxes (grouped by topic)
    const sl = $('sourceList');
    topics.forEach(t => {
      let group = `<div class="source-group-title" style="color:${t.color};">${t.icon} ${escHtml(t.name)}</div>`;
      t.sources.forEach(s => {
        const k = t.key + '__' + s.name;
        group += `<div class="source-row">
                    <input type="checkbox" id="src_${k}" ${sourceOn[k] !== false ? 'checked' : ''} />
                    <label for="src_${k}">${escHtml(s.name)}</label>
                  </div>`;
      });
      sl.insertAdjacentHTML('beforeend', group);
    });

    // Source checkbox listeners
    sl.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', function () {
        const k = this.id.replace('src_', '');
        sourceOn[k] = this.checked;
        saveState();
        cache = {};
      });
    });

    // Add topic
    $('addTopicBtn').addEventListener('click', addTopic);
    $('newTopicInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTopic(); });

    // Refresh
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

    const topic = {
      name, key,
      color: colors[idx],
      icon:  emojis[idx],
      sources: [
        { name: name + ' Blog',  url: `https://${key}.io/feed/`,           site: `https://${key}.io` },
        { name: name + ' News',  url: `https://${key}news.com/feed/`,     site: `https://${key}news.com` }
      ]
    };

    topics.push(topic);
    enabled[topic.key] = true;
    topic.sources.forEach(s => { sourceOn[topic.key + '__' + s.name] = true; });
    saveState();
    renderTabs();
    renderSettingsBody();
    input.value = '';
  }

  async function refreshAll () {
    cache = {};
    const btn = $('refreshBtn');
    btn.style.opacity = '.5';
    btn.style.pointerEvents = 'none';

    await Promise.all(topics.filter(t => enabled[t.key]).map(t =>
      fetchTopic(t.key).then(articles => {
        cache[t.key] = articles;
        updateCount(t.key, articles.length);
      })
    ));

    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    if (currentTab) renderCards(cache[currentTab] || [], currentTab);
  }

  /* ═══ READER PREFS ═══ */
  function bindReader () {
    // Font toggles
    document.querySelectorAll('#fontToggle .toggle-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#fontToggle .toggle-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        readerPrefs.font = this.dataset.font;
        applyReaderPrefs();
        saveReaderPrefs();
      });
    });

    // Font size slider
    const slider = $('fontSizeSlider');
    slider.addEventListener('input', function () {
      readerPrefs.size = +this.value;
      applyReaderPrefs();
      saveReaderPrefs();
    });

    // BG swatches
    document.querySelectorAll('.swatch').forEach(sw => {
      sw.addEventListener('click', function () {
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        this.classList.add('active');
        readerPrefs.bg = this.dataset.bg;
        applyReaderPrefs();
        saveReaderPrefs();
      });
    });
  }

  function applyReaderPrefs () {
    const body = document.body;
    const root = document.documentElement;

    // Font family
    const fontMap = { sans: 'var(--font-sans)', serif: 'var(--font-serif)', mono: 'var(--font-mono)' };
    root.style.setProperty('--current-font', fontMap[readerPrefs.font] || fontMap.sans);
    body.style.fontFamily = fontMap[readerPrefs.font];

    // Font size
    root.style.setProperty('--current-size', readerPrefs.size + 'px');
    body.style.fontSize = readerPrefs.size + 'px';

    // BG
    root.style.setProperty('--bg-primary', readerPrefs.bg);
    body.style.background = readerPrefs.bg;

    // Light / parchment class helpers
    body.classList.remove('light-mode', 'parchment-mode');
    if (readerPrefs.bg === '#fafafa') body.classList.add('light-mode');
    if (readerPrefs.bg === '#f5f0eb') body.classList.add('parchment-mode');

    // Update slider & swatch active states (after DOM ready)
    if ($('fontSizeSlider'))  $('fontSizeSlider').value = readerPrefs.size;
    if ($('sizePreview'))     $('sizePreview').style.fontSize = readerPrefs.size + 'px';

    document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.bg === readerPrefs.bg));
    document.querySelectorAll('#fontToggle .toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.font === readerPrefs.font));
  }

  /* ═══ HELPERS ═══ */
  function escHtml (s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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
    const now  = Date.now();
    const diff = now - date;
    if (diff < 3600000)  return Math.max(1, Math.floor(diff/60000)) + 'm ago';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
    if (diff < 172800000) return '1d ago';
    return date.toLocaleDateString(undefined, { month:'short', day:'numeric' });
  }

  function getFavicon (url) {
    try {
      const origin = new URL(url).origin;
      return origin + '/favicon.ico';
    } catch (_) { return ''; }
  }

})();
