# 📰 DevFeed — Developer News Hub

A modern, Notion-inspired RSS news aggregator built for developers. Dark mode by default, fully customisable reading experience, and zero backend required.

---

## ✨ Features

- **Notion-style dark UI** — Clean, minimal aesthetic with smooth animations and glassmorphism top bar
- **Dark mode by default** — Multiple background colour themes including light and parchment modes
- **Topic tabs** — Browse news by category; tabs scroll horizontally on mobile
- **Live RSS fetching** — Pulls articles in real time from official RSS/Atom feeds via CORS proxies (no server needed)
- **Featured images** — Automatically extracts images from RSS `<enclosure>`, `<media:thumbnail>`, or inline `<img>` tags
- **Site favicons** — Each card shows the source site's favicon next to the site name
- **Short descriptions** — Clean, stripped-HTML summaries beneath every title
- **Reading options panel**
  - Font style: Sans Serif / Serif / Monospace
  - Font size slider (13 px – 20 px)
  - Background colour swatches (8 presets)
- **Settings panel**
  - Toggle topics on / off
  - Enable / disable individual sources per topic
  - Add custom topics (sources are auto-suggested; swap in real URLs afterward)
  - One-click refresh for all feeds
- **Persistent preferences** — All settings and reading preferences are saved in `localStorage`
- **Zero dependencies** — Vanilla HTML + CSS + JS. No bundler, no framework, no Node.js build step

---

## 📂 Project Structure

```
devfeed/
├── index.html        ← Entry point & HTML structure
├── styles.css        ← All styles (CSS variables, dark/light themes, responsive)
├── sources.js        ← Default topic & RSS source definitions
├── app.js            ← Application logic (fetch, parse, render, settings)
├── favicon.svg       ← Site icon
└── README.md         ← This file
```

---

## 🌐 Default Topics & Sources

| Topic | Sources |
|---|---|
| **PHP** | PHP.net News, PHP.net RFC, Laravel News, Laracasts, PHP Weekly |
| **JavaScript** | JavaScript Weekly, Dev.to JS, MDN Blog, CSS-Tricks, Smashing Magazine |
| **WordPress** | WordPress.org News, WP Engine Blog, WordPress Tavern, Kinsta Blog, SitePoint |
| **AI & ML** | Towards Data Science, AI News, The Gradient, Hugging Face Blog, Google AI Blog |
| **Security** | The Hacker News, Bleeping Computer, SecurityWeek, OWASP News, Krebs on Security |
| **Patchstack** | Patchstack Blog, Patchstack Vulnerabilities |
| **Wordfence** | Wordfence Blog, Wordfence Alerts |
| **DevOps & Cloud** | InfoQ, Docker Blog, HashiCorp Blog, The New Stack |
| **Open Source** | Hacker News (Top), GitHub Blog, Linux Foundation |

---

## 🚀 Deploy to Netlify

### Option A — Drag & Drop
1. Download or clone this repository.
2. Go to [app.netlify.com](https://app.netlify.com).
3. Click **Add a new site → Deploy manually**.
4. Drag the project folder onto the upload area.
5. Click **Deploy** — your site is live in seconds.

### Option B — Git Deploy
1. Push this repo to GitHub (or GitLab / Bitbucket).
2. Go to [app.netlify.com → Add a new site → Import an existing project](https://app.netlify.com).
3. Connect your Git provider and select the repository.
4. Leave build settings **blank** (no build command needed).
5. Click **Deploy**.

> ⚡ No build step, no `package.json`, no CI — Netlify serves the static files directly.

---

## ⚙️ Customisation

### Add or edit sources

Open **`sources.js`** and modify the `DEFAULT_TOPICS` array. Each topic object looks like:

```js
{
  name: "PHP",          // Display name
  key: "php",           // Unique slug (used as localStorage key)
  color: "#7b68ee",     // Accent colour (hex)
  icon: "🐘",           // Emoji shown in the tab
  sources: [
    {
      name: "PHP.net News",                          // Source display name
      url:  "https://www.php.net/rss/news.xml",     // RSS / Atom feed URL
      site: "https://www.php.net"                    // Homepage (used for favicon)
    }
  ]
}
```

### Change the CORS proxy

If the default proxies are rate-limited or blocked, edit the `CORS_PROXIES` array at the top of **`app.js`**:

```js
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];
```

The app tries each proxy in order and falls back to the next on failure.

### Self-host a CORS proxy

For production use you can deploy your own proxy (e.g. [allorigins](https://github.com/nicolo-ribaudo/allorigins)) and replace the URLs above.

---

## 📱 Browser Support

| Browser | Supported |
|---|---|
| Chrome / Edge (latest) | ✅ |
| Firefox (latest) | ✅ |
| Safari 14+ | ✅ |
| Mobile Safari / Chrome | ✅ |

---

## ⚠️ Disclaimer

**DevFeed aggregates headlines and summaries from third-party RSS feeds and public APIs. We do not own, author, or endorse any of the linked content. All articles remain the intellectual property of their original publishers. Clicking a card will redirect you to the original source. Use at your own risk.**

- Feed availability depends on third-party CORS proxy services.
- Some feeds may occasionally be unavailable due to upstream changes or rate-limiting.
- User data (preferences, enabled topics) is stored locally in the browser via `localStorage` and is never sent to any server.

---

## 📄 License

This project is provided as-is for personal and educational use. See the [Disclaimer](#-disclaimer) section above.
