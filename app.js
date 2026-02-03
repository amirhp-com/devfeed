/**
 * ═══════════════════════════════════════════════════
 *  DevFeed — Main Application Logic  (updated)
 * ═══════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /* ─── CORS Proxy list (fallback chain) ─── */
  const CORS_PROXIES = [
    'https://cors.amirhp.workers.dev/?url=',
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://cors-anywhere.herokuapp.com/'
  ];

  /* ─── DOM refs ─── */
  const $ = id => document.getElementById(id);
  const feed = $('feed');
  const feedEmpty = $('feedEmpty');
  const tabsList = $('tabsList');

  // Near the top, after DOM refs
  let hideReadArticles = localStorage.getItem('devfeed_hideRead') === 'true';

  // Update body class
  function updateReadVisibility() {
    if (hideReadArticles) {
      document.body.classList.add('hide-read');
    } else {
      document.body.classList.remove('hide-read');
    }
    localStorage.setItem('devfeed_hideRead', hideReadArticles);
  }

  // Update button icon & title
  function updateToggleReadButton() {
    const btn = document.getElementById('toggleRead');
    if (!btn) return;

    if (hideReadArticles) {
      btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg>
    `;
      btn.setAttribute('data-tippy-content', 'Show all articles (including read)');
    } else {
      btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    `;
      btn.setAttribute('data-tippy-content', 'Show all articles (including read)');
    }
    initTooltips();
  }

  // Toggle function
  function toggleReadVisibility() {
    hideReadArticles = !hideReadArticles;
    updateReadVisibility();
    updateToggleReadButton();
  }

  /* ─── State ─── */
  let topics = [];
  let enabled = {};
  let sourceOn = {};
  let readArticles = new Set();
  let currentTab = null;
  let cache = {};
  let readerPrefs = { font: 'sans', size: 15, bg: '#0f0f12' };

  // ─── TIPPY INITIALIZATION ───
  function initTooltips() {
    tippy('[data-tippy-content]', {
      placement: 'top',           // default position
      animation: 'shift-away',
      duration: [200, 150],       // show / hide duration
      delay: [300, 100],          // slight delay before show
      maxWidth: 280,
      theme: 'material-dark',     // or 'light', 'material', etc.
      allowHTML: true,            // if you ever want HTML in tooltips
      arrow: true,
      interactive: false,
      zIndex: 9999,
    });
  }

  /* ─── INIT ─── */
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    applyReaderPrefs();
    paintSwatches();
    renderTabs();
    bindPanels();
    bindReader();
    bindReaderModal();
    initTooltips();
    $('refreshBtn').addEventListener('click', refreshAll);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        const modal = $('readerModal');
        if (modal && modal.classList.contains('open')) {
          closeArticleReader();
        }
      }
    });
    const toggleReadBtn = document.getElementById('toggleRead');
    if (toggleReadBtn) {
      updateReadVisibility();       // apply saved state
      updateToggleReadButton();     // show correct icon
      toggleReadBtn.addEventListener('click', toggleReadVisibility);
    }
    selectTab(currentTab || topics[0]?.key);
  });

  /* ═══ PERSISTENCE ═══ */
  function loadState() {
    topics = getDefaultTopics();
    try {
      const saved = JSON.parse(localStorage.getItem('devfeed_topics'));
      if (Array.isArray(saved)) saved.forEach(t => { if (!topics.find(x => x.key === t.key)) topics.push(t); });
    } catch (_) { }

    try { const e = JSON.parse(localStorage.getItem('devfeed_enabled')); if (e) enabled = e; } catch (_) { }
    try { const s = JSON.parse(localStorage.getItem('devfeed_sourceOn')); if (s) sourceOn = s; } catch (_) { }
    try { const r = JSON.parse(localStorage.getItem('devfeed_reader')); if (r) readerPrefs = { ...readerPrefs, ...r }; } catch (_) { }

    try {
      const savedRead = JSON.parse(localStorage.getItem('devfeed_read')) || [];
      readArticles = new Set(savedRead);
    } catch (_) { }

    topics.forEach(t => {
      if (!(t.key in enabled)) enabled[t.key] = true;
      t.sources.forEach(s => { const k = t.key + '__' + s.name; if (!(k in sourceOn)) sourceOn[k] = true; });
    });
  }

  function saveState() {
    const defaults = getDefaultTopics();
    const userAdded = topics.filter(t => !defaults.find(d => d.key === t.key));
    localStorage.setItem('devfeed_topics', JSON.stringify(userAdded));
    localStorage.setItem('devfeed_enabled', JSON.stringify(enabled));
    localStorage.setItem('devfeed_sourceOn', JSON.stringify(sourceOn));
  }

  function saveReaderPrefs() {
    localStorage.setItem('devfeed_reader', JSON.stringify(readerPrefs));
  }

  function saveReadState() {
    localStorage.setItem('devfeed_read', JSON.stringify([...readArticles]));
  }

  /* ═══ TABS ═══ */
  function renderTabs() {
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

  function selectTab(key) {
    currentTab = key;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.key === key));
    showFeed(key);
  }

  /* ═══ FEED ═══ */
  function showFeed(key) {
    if (cache[key]) { renderCards(cache[key], key); return; }
    renderSkeleton();
    fetchTopic(key).then(articles => {
      cache[key] = articles;
      updateCount(key, articles.length);
      renderCards(articles, key);
    });
  }

  function updateCount(key, n) {
    const el = $('count_' + key);
    if (el) el.textContent = n;
  }

  function renderSkeleton() {
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

  function renderCards(articles, key) {
    feed.innerHTML = '';
    if (!articles.length) {
      feedEmpty.style.display = 'block';
      return;
    }
    feedEmpty.style.display = 'none';
    const topic = topics.find(t => t.key === key) || {};
    // Filter out read articles if hideReadArticles is true
    const visibleArticles = hideReadArticles ? articles.filter(a => !readArticles.has(a.link)) : articles;
    if (!visibleArticles.length) {
      feedEmpty.style.display = 'block';
      feedEmpty.innerHTML = `
          <p>All articles in this tab are read.</p>
          <span>Toggle to show read articles or mark some as unread.</span>
        `;
      return;
    }

    visibleArticles.forEach((a, i) => {
      const isRead = readArticles.has(a.link);

      const card = document.createElement('div');
      card.className = 'card' + (isRead ? ' read-article' : '');
      card.style.animationDelay = (i * 0.04) + 's';
      card.dataset.link = a.link || '';
      card.dataset.title = a.title || '';
      card.dataset.image = a.image || '';
      card.dataset.sourceName = a.sourceName || '';
      card.dataset.site = a.site || '';
      card.dataset.date = a.date || '';

      const faviconUrl = getFavicon(a.site || a.link);
      const readCheckboxId = `read-${key}-${i}`;

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
                    ${a.author ? `<span class="meta-sep">•</span><span class="meta-author">${escHtml(a.author)}</span>` : ''}
                    <span class="meta-tag" style="background:${topic.color}22;color:${topic.color};">${escHtml(topic.name || key)}</span>
                    <input type="checkbox" id="${readCheckboxId}" class="read-checkbox" ${isRead ? 'checked' : ''} />
                    <label for="${readCheckboxId}" class="read-checkbox-label" data-tippy-content="${isRead ? 'Mark as unread' : 'Mark as read'}"></label>
                  </div>
                  <h3 class="card-title ${isRead ? 'read-title' : ''}">${escHtml(a.title)}</h3>
                  <p class="card-desc">${escHtml(a.description)}</p>
                  <div class="card-footer">
                      <span class="footer-link">Read article →</span>
                      <span class="footer-link open">Open in New Tab →</span>
                  </div>
              </div>`;

      // Important: Force checkbox state after insertion into DOM
      const checkbox = card.querySelector(`#${readCheckboxId}`);
      if (checkbox) {
        checkbox.checked = isRead;           // force sync
      }

      // Toggle read status when checkbox is clicked
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();

        if (checkbox.checked) {
          readArticles.add(a.link);
          card.classList.add('read-article');
          card.querySelector('.card-title').classList.add('read-title');
        } else {
          readArticles.delete(a.link);
          card.classList.remove('read-article');
          card.querySelector('.card-title').classList.remove('read-title');
        }

        saveReadState();
      });

      // Open article → mark as read automatically
      card.addEventListener('click', (e) => {
        // Skip if user clicked the "Open in New Tab" link
        if (e.target.closest('.footer-link.open')) {
          window.open(a.link, "_blank");
          return; // let the <a> handle it naturally
        }
        if (!e.target.closest('.read-checkbox, .read-checkbox-label')) {
          if (!readArticles.has(a.link)) {
            readArticles.add(a.link);
            checkbox.checked = true;           // update checkbox visually
            card.classList.add('read-article');
            card.querySelector('.card-title').classList.add('read-title');
            saveReadState();
          }
          openArticleReader(a);
        }
      });

      feed.appendChild(card);
    });
    initTooltips();
  }

  /* ═══ RSS FETCHER ═══ */
  async function fetchTopic(key) {
    const topic = topics.find(t => t.key === key);
    if (!topic) return [];
    const activeSources = topic.sources.filter(s => sourceOn[key + '__' + s.name] !== false);
    const results = await Promise.all(activeSources.map(s => fetchFeed(s.url, s.name, s.site, s.type).catch(() => [])));
    const all = results.flat();
    all.sort((a, b) => (new Date(b.date) - new Date(a.date)) || 0);
    const seen = new Set();
    return all.filter(a => { const k = a.title.toLowerCase().trim(); if (seen.has(k)) return false; seen.add(k); return true; });
  }

  async function fetchFeed(url, sourceName, site, type = null) {
    let xml = null;
    for (const proxy of CORS_PROXIES) {
      try {
        const res = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
        if (res.ok) { xml = await res.text(); break; }
      } catch (_) { }
    }
    if (!xml) return [];
    return parseFeed(xml, sourceName, site, type);
  }

  async function parseFeed(xmlOrHtml, sourceName, site, type = null) {
    const articles = [];

    if (type === 'patchstack') {
      // ─── Patchstack HTML parsing ───
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlOrHtml, 'text/html');

      // Find all vulnerability links
      const vulnLinks = doc.querySelectorAll('tr>td:first-of-type>a[href^="/database/wordpress/"]');

      vulnLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        const fullUrl = new URL(href, 'https://patchstack.com').href;

        // Extract plugin/theme name
        const nameEl = link.querySelector('.flex.flex-col span:first-child');
        const name = nameEl ? nameEl.textContent.trim() : 'Unknown Vulnerability';

        // Extract version range (e.g. <= 1.7)
        const versionEl = link.querySelector('.whitespace-nowrap.text-dark4');
        const version = versionEl ? versionEl.textContent.trim() : '';

        // Extract vulnerability title
        const titleEl = link.querySelector('span[title]');
        const title = titleEl ? titleEl.getAttribute('title') || titleEl.textContent.trim() : name;

        // Build description from available parts
        const descParts = [version, title].filter(Boolean);
        const description = descParts.length ? descParts.join(' – ') : 'Vulnerability details';

        articles.push({
          title: `${name}`,
          link: fullUrl,
          date: link.parentElement?.parentElement?.querySelector("td:last-of-type")?.textContent.trim(), // Patchstack pages don't show date → use now
          description: description,
          image: '', // no image on Patchstack list
          sourceName,
          site,
          author: 'Patchstack',
          readingTime: '1 min read' // fixed – these are short
        });
      });
      return articles.slice(0, 20);
    } else {
      // ─── Normal RSS / Atom XML parsing ───
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlOrHtml, 'text/xml');

      if (doc.querySelector('parsererror')) return [];

      const items = doc.querySelectorAll('item, entry');

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
        let link = getText('link') || getAttr('link', 'href') || '';
        let date = getText('pubDate') || getText('published') || getText('updated') || getText('dc\\:date') || '';
        let desc = getText('description') || getText('summary') || getText('content') || '';
        desc = stripHtml(desc).substring(0, 300);

        let author = getText('author') ||
          getText('dc\\:creator') ||
          getText('name') || '';

        const wordCount = desc.split(/\s+/).filter(Boolean).length;
        const readingTimeMin = Math.max(1, Math.round(wordCount / 220));
        const readingTime = `${readingTimeMin} min read`;

        let image = getAttr('enclosure', 'url') ||
          getAttr('media\\:thumbnail', 'url') ||
          getAttr('media\\:content', 'url') ||
          getImgFromContent(getText('description') || getText('summary') || getText('content')) ||
          '';

        articles.push({
          title,
          link,
          date,
          description: desc,
          image,
          sourceName,
          site,
          author: author || null,
          readingTime
        });
      });
    }

    return articles.slice(0, 12);
  }

  function getImgFromContent(html) {
    if (!html) return '';
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return m ? m[1] : '';
  }

  /* ═══ IN-APP ARTICLE READER ═══ */
  function bindReaderModal() {
    // Back button is bound dynamically now
  }

  function openArticleReader(article) {
    const modal = $('readerModal');
    const body = $('readerBody');
    const meta = $('readerMeta');

    // Remove previous topbar if exists
    modal.querySelector('.reader-topbar')?.remove();

    const topbarHTML = `
      <div class="reader-topbar">
        <button class="reader-back" id="readerBack" data-tippy-content="Close (Esc)">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 4L6 10l6 6"/></svg>
          Back
        </button>
        <h1 class="reader-sticky-title">${escHtml(article.title)}</h1>
        <div class="reader-actions">
          <button class="icon-btn" id="copyUrlBtn" data-tippy-content="Copy article URL">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="icon-btn" id="shareTelegramBtn" data-tippy-content="Share to Telegram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 2 11 13"/>
              <path d="M22 2 15 22 11 13 2 9z"/>
            </svg>
          </button>
          <button class="icon-btn reader-settings-btn" data-tippy-content="Reading preferences" id="readerSettingsBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 7V4h16v3"/>
              <path d="M7 20h10"/>
              <path d="M12 4v16"/>
              <path d="M9 20h6"/>
            </svg>
          </button>
          <a class="icon-btn reader-ext-link" href="${escHtml(article.link)}" data-tippy-content="Open Original Source on New Tab" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>`;

    modal.querySelector('.reader-modal-inner').insertAdjacentHTML('afterbegin', topbarHTML);

    // Bind buttons
    document.getElementById('readerBack').addEventListener('click', closeArticleReader);
    document.getElementById('readerSettingsBtn').addEventListener('click', () => openPanel('readerPanel'));

    // Copy URL
    document.getElementById('copyUrlBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(article.link).then(() => {
        const btn = document.getElementById('copyUrlBtn');
        const originalColor = btn.style.color;
        btn.style.color = 'var(--accent-green)';
        setTimeout(() => { btn.style.color = originalColor || ''; }, 2000);
      }).catch(() => {
        alert('Failed to copy URL');
      });
    });

    // Share to Telegram
    document.getElementById('shareTelegramBtn').addEventListener('click', () => {
      const text = encodeURIComponent(article.title);
      const url = encodeURIComponent(article.link);
      window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer');
    });

    // Meta
    const faviconUrl = getFavicon(article.site || article.link);
    meta.innerHTML = `
      <img class="rmeta-favicon" src="${escHtml(faviconUrl)}" alt="" onerror="this.style.display='none'" />
      <span class="rmeta-site">${escHtml(article.sourceName || article.site || 'Unknown')}</span>
      ${article.author ? `<span class="rmeta-sep">•</span><span class="rmeta-author">By ${escHtml(article.author)}</span>` : ''}
      <span class="rmeta-sep">•</span>
      <span class="rmeta-reading-time">${article.readingTime}</span>
      <span class="rmeta-sep">•</span>
      <span class="rmeta-date">${formatDate(article.date)}</span>`;

    // Only content — no duplicate title or image
    body.innerHTML = `
      <div class="reader-loading"><div class="loader"></div>Fetching full article…</div>`;

    $('readerModal').classList.add('open');
    document.body.style.overflow = 'hidden';

    fetchArticleContent(article.link).then(html => {
      let readingTime = article.readingTime; // fallback to feed estimate

      if (html) {
        // Calculate from the actual cleaned content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        readingTime = estimateReadingTime(plainText);
        body.innerHTML = html;
      } else {
        // Fallback case - no full content
        body.innerHTML = `
            <div class="reader-fallback">
                <p>${escHtml(article.description || 'No preview available.')}</p>
                <a href="${escHtml(article.link)}" target="_blank" rel="noopener noreferrer" class="reader-ext-link" style="justify-content:center;font-size:15px;">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 3h4v4"/><path d="M17 3L8 12"/><path d="M14 10v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>
                    Read full article on ${escHtml(article.sourceName || 'original site')}
                </a>
            </div>`;
      }
      // Update the meta row with accurate reading time
      const meta = $('readerMeta');
      const currentMetaHTML = meta.innerHTML;
      const updatedMeta = currentMetaHTML.replace(
        /<span class="rmeta-reading-time">.*?<\/span>/,
        `<span class="rmeta-reading-time">${readingTime}</span>`
      );
      meta.innerHTML = updatedMeta;
    });

    initTooltips();
  }

  function closeArticleReader() {
    $('readerModal').classList.remove('open');
    document.body.style.overflow = '';
  }

  async function fetchArticleContent(url) {
    if (!url) return null;
    for (const proxy of CORS_PROXIES) {
      try {
        const res = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(12000) });
        if (res.ok) {
          const html = await res.text();
          return extractMainContent(html);
        }
      } catch (_) { }
    }
    return null;
  }

  function extractMainContent(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    ['script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside',
      'iframe', 'video', 'audio', 'canvas', 'svg',
      '.sidebar', '#sidebar', '.ad', '.ads', '.cookie', '[class*=cookie]',
      '[class*=popup]', '[class*=modal]', '[class*=banner]',
      '[class*=nav]', '[class*=menu]'
    ].forEach(sel => {
      tmp.querySelectorAll(sel).forEach(el => el.remove());
    });

    let container = tmp.querySelector('article');

    if (!container) {
      let best = null, bestLen = 0;
      tmp.querySelectorAll('div, section, main').forEach(el => {
        const len = (el.textContent || '').trim().length;
        if (len > bestLen && len < 50000) { best = el; bestLen = len; }
      });
      container = best;
    }

    if (!container || (container.textContent || '').trim().length < 60) return null;

    const allowed = new Set(['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'blockquote',
      'pre', 'code', 'img', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption', 'figure', 'figcaption']);

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
    const toRemove = [];
    while (walker.nextNode()) {
      if (!allowed.has(walker.currentNode.tagName.toLowerCase())) toRemove.push(walker.currentNode);
    }
    toRemove.forEach(el => {
      while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
      el.remove();
    });

    container.querySelectorAll('*').forEach(el => {
      const tag = el.tagName.toLowerCase();
      const keep = tag === 'img' ? ['src', 'alt'] : tag === 'a' ? ['href'] : [];
      [...el.attributes].forEach(attr => { if (!keep.includes(attr.name)) el.removeAttribute(attr.name); });
    });

    container.querySelectorAll('a').forEach(a => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });

    const ps = container.querySelectorAll('p');
    for (let i = ps.length - 1; i >= 0; i--) {
      if ((ps[i].textContent || '').trim() === '') ps[i].remove();
      else break;
    }

    return container.innerHTML;
  }

  /* ═══ PANELS ═══ */
  function bindPanels() {
    $('btnSettings').addEventListener('click', () => { renderSettingsBody(); openPanel('settingsPanel'); });
    $('settingsClose').addEventListener('click', () => closePanel('settingsPanel'));
    $('settingsOverlay').addEventListener('click', () => closePanel('settingsPanel'));

    $('btnReader').addEventListener('click', () => openPanel('readerPanel'));
    $('readerClose').addEventListener('click', () => closePanel('readerPanel'));
    $('readerOverlay').addEventListener('click', () => closePanel('readerPanel'));
  }

  function openPanel(id) { $(id).classList.add('open'); }
  function closePanel(id) { $(id).classList.remove('open'); }

  /* ═══ SETTINGS BODY ═══ */
  function renderSettingsBody() {
    const body = $('settingsBody');
    let html = '<label class="setting-label">Topics</label><div class="topic-list" id="topicList"></div>';
    html += `<div class="add-topic-wrap"><input type="text" id="newTopicInput" placeholder="e.g. React, Rust, …" /><button id="addTopicBtn">+ Add</button></div>`;
    html += `<button class="refresh-btn" id="refreshBtn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg> Refresh all feeds</button>`;
    html += `<label class="setting-label" style="margin-top:28px;">Default Sources</label><div class="source-group" id="sourceList"></div>`;
    body.innerHTML = html;

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
      cb.addEventListener('change', function () { sourceOn[this.id.replace('src_', '')] = this.checked; saveState(); cache = {}; });
    });

    $('addTopicBtn').addEventListener('click', addTopic);
    $('newTopicInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTopic(); });
    $('refreshBtn').addEventListener('click', refreshAll);
  }

  function addTopic() {
    const input = $('newTopicInput');
    const raw = input.value.trim();
    if (!raw) return;
    const name = raw.charAt(0).toUpperCase() + raw.slice(1);
    const key = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || topics.find(t => t.key === key)) {
      input.style.borderColor = 'var(--accent-orange)';
      setTimeout(() => input.style.borderColor = '', 1200);
      return;
    }
    const colors = ['#7b68ee', '#60a5fa', '#34d399', '#fb923c', '#f472b6', '#a78bfa', '#38bdf8'];
    const emojis = ['📰', '💬', '🔧', '📡', '🚀', '⚙️', '🌟'];
    const idx = topics.length % colors.length;
    const topic = {
      name, key, color: colors[idx], icon: emojis[idx],
      sources: [
        { name: name + ' Blog', url: `https://${key}.io/feed/`, site: `https://${key}.io` },
        { name: name + ' News', url: `https://${key}news.com/feed/`, site: `https://${key}news.com` }
      ]
    };
    topics.push(topic);
    enabled[topic.key] = true;
    topic.sources.forEach(s => { sourceOn[topic.key + '__' + s.name] = true; });
    saveState(); renderTabs(); renderSettingsBody();
    input.value = '';
  }

  async function refreshAll() {
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
  function bindReader() {
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

  function applyReaderPrefs() {
    const root = document.documentElement;
    const body = document.body;

    const fontMap = { sans: "'DM Sans', sans-serif", serif: "'Fraunces', serif", mono: "'Source Code Pro', monospace" };
    root.style.setProperty('--current-font', fontMap[readerPrefs.font] || fontMap.sans);

    root.style.setProperty('--current-size', readerPrefs.size + 'px');

    root.style.setProperty('--bg-primary', readerPrefs.bg);
    body.style.background = readerPrefs.bg;

    body.classList.remove('light-mode', 'parchment-mode');
    if (readerPrefs.bg === '#fafafa') body.classList.add('light-mode');
    if (readerPrefs.bg === '#f5f0eb') body.classList.add('parchment-mode');

    if ($('fontSizeSlider')) $('fontSizeSlider').value = readerPrefs.size;
    if ($('sizePreview')) $('sizePreview').style.fontSize = readerPrefs.size + 'px';

    document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.bg === readerPrefs.bg));
    document.querySelectorAll('#fontToggle .toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.font === readerPrefs.font));
  }

  function paintSwatches() {
    document.querySelectorAll('.swatch').forEach(sw => {
      sw.style.backgroundColor = sw.dataset.bg;
    });
  }

  /* ═══ HELPERS ═══ */
  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date)) return d;
    const diff = Date.now() - date;
    if (diff < 3600000) return Math.max(1, Math.floor(diff / 60000)) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 172800000) return '1d ago';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function estimateReadingTime(text) {
    if (!text) return '1 min read';
    // Rough average: 220–250 words per minute
    // Count words (split on whitespace, remove extra spaces)
    const words = text.trim().split(/\s+/).length;
    // More generous for technical content: ~200 wpm
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
  }

  function getFavicon(url) {
    try { return new URL(url).origin + '/favicon.ico'; } catch (_) { return ''; }
  }

})();