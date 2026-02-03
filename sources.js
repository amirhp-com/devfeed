/**
 * ═══════════════════════════════════════════════════
 *  DevFeed — Default Sources & Topic Definitions
 *  Edit this file to add / remove topics and feeds.
 * ═══════════════════════════════════════════════════
 *
 *  Each topic has:
 *    name   – display name
 *    key    – unique slug (used in localStorage)
 *    color  – accent hex used for the tab dot & tag
 *    icon   – emoji shown in the tab
 *    sources– array of { name, url (RSS/Atom feed), site (homepage) }
 */

const DEFAULT_TOPICS = [
  {
    name: "PHP",
    key: "php",
    color: "#7b68ee",
    icon: "🐘",
    sources: [
      { name: "PHP.net Wiki"   , url: "https://wiki.php.net/feed.php", site: "https://wiki.php.net" },
      { name: "Laravel News"  , url: "https://feed.laravel-news.com", site: "https://laravel-news.com" },
      { name: "Laracasts"     , url: "https://laracasts.com/feed", site: "https://laracasts.com" },
      { name: "PHP Watch"     , url: "https://php.watch/feed/articles.xml", site: "https://www.php.watch" },
      { name: "PHP Foundation", url: "https://thephp.foundation/atom.xml", site: "https://thephp.foundation" }
    ]
  },
  {
    name: "JavaScript",
    key: "js",
    color: "#f7df1e",
    icon: "⚡",
    sources: [
      { name: "JavaScript Weekly"  , url: "https://javaScriptweekly.com/rss", site: "https://javascriptweekly.com" },
      { name: "Dev.to – JavaScript", url: "https://dev.to/feed/javascript", site: "https://dev.to/t/javascript" },
      { name: "MDN Blog"           , url: "https://developer.mozilla.org/en/blog/rss.xml", site: "https://developer.mozilla.org/en/blog" },
      { name: "CSS-Tricks"         , url: "https://css-tricks.com/feed/", site: "https://css-tricks.com" },
      { name: "Smashing Magazine"  , url: "https://www.smashingmagazine.com/feed/", site: "https://www.smashingmagazine.com" }
    ]
  },
  {
    name: "WordPress",
    key: "wordpress",
    color: "#0073aa",
    icon: "🌐",
    sources: [
      { name: "WordPress.org News", url: "https://wordpress.org/news/feed/", site: "https://wordpress.org/news" },
      { name: "WP Engine Blog", url: "https://wpengine.com/blog/feed/", site: "https://wpengine.com/blog" },
      { name: "WordPress Tavern", url: "https://wptavern.com/feed/", site: "https://wptavern.com" },
      { name: "Kinsta Blog", url: "https://kinsta.com/blog/feed/", site: "https://kinsta.com/blog" },
      { name: "SitePoint – WordPress", url: "https://www.sitepoint.com/feed/", site: "https://www.sitepoint.com" }
    ]
  },
  {
    name: "AI & ML",
    key: "ai",
    color: "#a78bfa",
    icon: "🤖",
    sources: [
      { name: "Towards Data Science", url: "https://towardsdatascience.com/feed", site: "https://towardsdatascience.com" },
      { name: "AI News", url: "https://ai-news.io/rss.xml", site: "https://ai-news.io" },
      { name: "The Gradient", url: "https://thegradient.pub/rss/", site: "https://thegradient.pub" },
      { name: "Hugging Face Blog", url: "https://huggingface.co/papers/rss", site: "https://huggingface.co/blog" },
      { name: "Google AI Blog", url: "https://ai.google/blog/rss", site: "https://ai.google/blog" }
    ]
  },
  {
    name: "Security",
    key: "security",
    color: "#fb923c",
    icon: "🔐",
    sources: [
      { name: "The Hacker News", url: "https://thehackernews.com/feeds/posts/default", site: "https://thehackernews.com" },
      { name: "Bleeping Computer", url: "https://www.bleepingcomputer.com/feed/rss/", site: "https://www.bleepingcomputer.com" },
      { name: "SecurityWeek", url: "https://www.securityweek.com/feed/", site: "https://www.securityweek.com" },
      { name: "OWASP News", url: "https://owasp.org/feed/", site: "https://owasp.org" },
      { name: "Krebs on Security", url: "https://krebs.feedburner.com/", site: "https://krebsonsecurity.com" }
    ]
  },
  {
    name: "Patchstack",
    key: "patchstack",
    color: "#34d399",
    icon: "🛡️",
    sources: [
      { name: "Patchstack", url: "https://patchstack.com/feed", site: "https://patchstack.com/articles/" }
    ]
  },
  {
    name: "Wordfence",
    key: "wordfence",
    color: "#60a5fa",
    icon: "🔒",
    sources: [
      { name: "Wordfence Blog", url: "https://www.wordfence.com/blog/feed/", site: "https://www.wordfence.com/blog" },
      { name: "Wordfence Alerts", url: "https://www.wordfence.com/feed", site: "https://www.wordfence.com/threat-intelligence" }
    ]
  },
  {
    name: "DevOps & Cloud",
    key: "devops",
    color: "#f472b6",
    icon: "☁️",
    sources: [
      { name: "InfoQ", url: "https://www.infoq.com/rss", site: "https://www.infoq.com" },
      { name: "Docker Blog", url: "https://docs.docker.com/blog/feed/", site: "https://docs.docker.com/blog" },
      { name: "HashiCorp Blog", url: "https://www.hashicorp.com/blog/feed", site: "https://www.hashicorp.com/blog" },
      { name: "The New Stack", url: "https://thenewstack.io/feed/", site: "https://thenewstack.io" }
    ]
  },
  {
    name: "Open Source",
    key: "opensource",
    color: "#fb923c",
    icon: "📦",
    sources: [
      { name: "Hacker News (Top)", url: "https://news.ycombinator.com/rss", site: "https://news.ycombinator.com" },
      { name: "GitHub Blog", url: "https://github.blog/feed/", site: "https://github.blog" },
      { name: "Linux Foundation", url: "https://linuxfoundation.org/feed/", site: "https://linuxfoundation.org" }
    ]
  }
];

/**
 * Returns the full list of default topic definitions (deep copy).
 */
function getDefaultTopics() {
  return JSON.parse(JSON.stringify(DEFAULT_TOPICS));
}
