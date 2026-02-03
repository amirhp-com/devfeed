# 📰 DevFeed — Developer News Hub

**Version 2.1**
A modern, Notion-inspired RSS news aggregator built for developers. Dark mode by default, fully customisable reading experience, and zero backend required.

---

## ✨ Features

- **Notion-style dark UI** — Clean, minimal aesthetic with smooth animations and glassmorphism top bar
- **Dark mode by default** — Multiple background colour themes (Notion Dark, Deep Navy, Catppuccin, Midnight, Carbon, GitHub Dark, Paper White, Parchment)
- **Topic tabs** — Browse news by category; tabs scroll horizontally on mobile
- **Live RSS fetching** — Pulls articles in real time from official RSS/Atom feeds
- **Featured images** — Automatically extracts images from RSS `<enclosure>`, `<media:thumbnail>`, or inline `<img>` tags
- **Site favicons** — Each card shows the source site's favicon next to the site name
- **Short descriptions** — Clean, stripped-HTML summaries beneath every title
- **I've read / unread tracking** — Checkbox-style read markers next to each article
  - Auto-mark as read when opening an article
  - Manual toggle to mark/unmark
  - Read articles appear grayed-out (image, title, description, link) with faded card style
- **In-app article reader** — Clean, distraction-free view
  - Sticky title bar
  - No duplicate title or featured image in body
  - **Copy URL** button
  - **Share to Telegram** button
  - Close with **Esc** key
- **Accurate reading time** — Estimated from full fetched article content (in reader modal)
- **Reading options panel**
  - Font style: Sans Serif / Serif / Monospace
  - Font size slider (13 px – 20 px)
  - Background colour swatches (8 presets)
- **Settings panel**
  - Toggle topics on/off
  - Enable/disable individual sources per topic
  - Add custom topics (auto-suggested placeholder sources)
  - One-click refresh for all feeds
- **Share options** — Copy article URL + Share to Telegram (from reader modal)
- **Persistent preferences** — All settings, read status and reading preferences saved in `localStorage`
- **Zero dependencies** — Vanilla HTML + CSS + JS. No bundler, no framework, no Node.js build step

---

## What's New in v2.1

- **Read/unread tracking with checkbox**
  - Single checkbox next to article title (replaced previous ○/✓ icons)
  - Auto-marks as read when opening the article
  - Visual feedback: read articles are grayed out (image, title, description, link)
- **Improved reader modal**
  - Removed duplicate title and featured image from body content
  - Sticky title in top bar
  - Added **Copy URL** and **Share to Telegram** buttons
  - Close reader modal with **Esc** key
- **Accurate reading time**
  - Feed cards: rough estimate from description (fallback)
  - Reader modal: real calculation from full fetched article content
- **Custom Cloudflare CORS proxy**
  - Added your own Cloudflare Worker as primary proxy → faster and more reliable
  - Multiple public fallback proxies still included

---

## Default Topics & Sources

| Topic              | Sources                                                                 |
|--------------------|-------------------------------------------------------------------------|
| **PHP**            | PHP.net News, PHP.net RFC, Laravel News, Laracasts, PHP Weekly          |
| **JavaScript**     | JavaScript Weekly, Dev.to JS, MDN Blog, CSS-Tricks, Smashing Magazine  |
| **WordPress**      | WordPress.org News, WP Engine Blog, WordPress Tavern, Kinsta Blog      |
| **AI & ML**        | Towards Data Science, AI News, The Gradient, Hugging Face Blog         |
| **Security**       | The Hacker News, Bleeping Computer, SecurityWeek, OWASP News           |
| **Patchstack**     | Patchstack Blog, Patchstack Vulnerabilities                            |
| **Wordfence**      | Wordfence Blog, Wordfence Alerts                                       |
| **DevOps & Cloud** | InfoQ, Docker Blog, HashiCorp Blog, The New Stack                     |
| **Open Source**    | Hacker News (Top), GitHub Blog, Linux Foundation                       |

---

## Deploy to Netlify / GitHub Pages / Vercel

### Drag & Drop (Netlify)

1. Download or clone this repository.
2. Go to https://app.netlify.com
3. Add new site → Deploy manually
4. Drag the project folder and deploy

### Git Deploy

1. Push this repo to GitHub / GitLab / Bitbucket
2. Connect it in Netlify / Vercel / GitHub Pages
3. No build command needed — pure static files

---

## Customisation

### Add or edit sources

Open `sources.js` and modify the `DEFAULT_TOPICS` array.

### Change / add CORS proxies

Edit the `CORS_PROXIES` array at the top of `app.js`:

```js
const CORS_PROXIES = [
  'https://your-cloudflare-worker-name.your-account.workers.dev/?url=',   // ← your own fast proxy
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];
```

The app tries each proxy in order until one succeeds.

---

## Browser Support

| Browser             | Supported |
|---------------------|-----------|
| Chrome / Edge       | ✅        |
| Firefox             | ✅        |
| Safari 14+          | ✅        |
| Mobile browsers     | ✅        |

---

## Disclaimer

**DevFeed aggregates headlines and summaries from third-party RSS feeds and public APIs. We do not own, author, or endorse any of the linked content. All articles remain the intellectual property of their original publishers. Use at your own risk.**

- Feed availability depends on third-party services and CORS proxies.
- Some feeds/sites may block proxy requests — using your own Cloudflare Worker gives the best reliability.
- All user data (preferences, read status) is stored locally in the browser via `localStorage`.

---

## License

Provided as-is for personal and educational use.
See the [Disclaimer](#disclaimer) section above.