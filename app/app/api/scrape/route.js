/**
 * /api/scrape
 *
 * Scrapes a LinkedIn post URL and returns:
 *   { author, content, title, success, strategy }
 *
 * Strategy order:
 *  1. Direct HTTP fetch with browser-like headers → parse meta/OG/JSON-LD
 *  2. Puppeteer headless Chrome (system Chrome) — handles JS-rendered pages
 *  3. Return partial data from whatever was found
 */

import { parse } from 'node-html-parser';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE_DIR = path.join(process.cwd(), '.chrome-profile');

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

// ─── HTML Parser helpers ─────────────────────────────────────────────────────

function getMeta(root, name) {
  return (
    root.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ||
    root.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ||
    ''
  );
}

function extractFromHTML(html) {
  const root = parse(html);

  const ogDescription = getMeta(root, 'og:description');
  const ogTitle = getMeta(root, 'og:title');
  const twitterDesc = getMeta(root, 'twitter:description');
  const description = getMeta(root, 'description');

  // Try JSON-LD structured data
  let jsonLdContent = '';
  let jsonLdAuthor = '';
  const scripts = root.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.text);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item.articleBody) jsonLdContent = item.articleBody;
        if (item.description) jsonLdContent = jsonLdContent || item.description;
        if (item.author?.name) jsonLdAuthor = item.author.name;
        if (item.name) jsonLdAuthor = jsonLdAuthor || item.name;
      }
    } catch {}
  }

  // Try to find author from various meta tags
  const author =
    jsonLdAuthor ||
    getMeta(root, 'author') ||
    getMeta(root, 'og:site_name') ||
    '';

  // Build content from best available source
  const content =
    jsonLdContent ||
    ogDescription ||
    twitterDesc ||
    description ||
    '';

  return { author, content: content.trim(), title: ogTitle };
}

// ─── Strategy 1: Direct HTTP fetch ──────────────────────────────────────────

async function fetchDirect(url) {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) return null;

  const html = await res.text();

  // If LinkedIn redirected to login page, bail
  if (
    html.includes('authwall') ||
    html.includes('login-page') ||
    html.includes('Sign in to LinkedIn') ||
    html.includes('Join LinkedIn')
  ) {
    return null;
  }

  return extractFromHTML(html);
}

// ─── Strategy 2: Puppeteer headless Chrome ───────────────────────────────────

async function fetchWithPuppeteer(url) {
  let puppeteer;
  try {
    puppeteer = await import('puppeteer-core');
  } catch {
    return null;
  }

  let browser;
  try {
    browser = await puppeteer.default.launch({
      executablePath: CHROME_PATH,
      headless: true,
      userDataDir: PROFILE_DIR,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    const page = await browser.newPage();

    // Mask automation signals
    await page.setExtraHTTPHeaders(BROWSER_HEADERS);
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Wait a moment for any JS rendering
    await new Promise((r) => setTimeout(r, 2500));

    const html = await page.content();

    // Extract DOM content before closing the browser
    const domData = await page.evaluate(() => {
      // Find author name
      const authorSelectors = [
        '.update-components-actor__title',
        '.feed-shared-actor__title',
        '.update-components-actor__name',
        '.feed-shared-actor__name',
        'h3.feed-shared-actor__title',
        '.feed-identity-module__name',
      ];
      let author = '';
      for (const sel of authorSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          author = el.textContent.trim().split('\n')[0].trim();
          author = author.replace(/\s*•\s*(Following|Follow|1st|2nd|3rd\+?)/i, '').trim();
          break;
        }
      }

      // Find post content
      const contentSelectors = [
        '.update-components-text',
        '.feed-shared-update-v2__commentary',
        '.feed-shared-inline-show-more-text',
        '.update-components-commentary',
        '.feed-shared-text',
        '.feed-shared-annotated-text',
        'article .commentary',
        '.main-content',
      ];
      let content = '';
      for (const sel of contentSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          content = el.textContent.trim();
          break;
        }
      }
      return { author, content };
    });

    await browser.close();

    // Check if we hit an auth wall
    if (
      html.includes('authwall') ||
      html.includes('Sign in to LinkedIn') ||
      html.includes('Join LinkedIn')
    ) {
      return { authWall: true };
    }

    const result = extractFromHTML(html);

    // Merge DOM data with metadata (prefer direct DOM text if found)
    if (domData.content) result.content = domData.content;
    if (domData.author) result.author = domData.author;

    return result;
  } catch (err) {
    console.error('[scrape] Puppeteer error:', err.message);
    if (browser) await browser.close().catch(() => {});
    return null;
  }
}

// ─── Strategy 3: Try Google Cache ───────────────────────────────────────────

async function fetchGoogleCache(url) {
  const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
  try {
    const res = await fetch(cacheUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractFromHTML(html);
  } catch {
    return null;
  }
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const postUrl = searchParams.get('url');

  if (!postUrl) {
    return Response.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  if (!postUrl.includes('linkedin.com')) {
    return Response.json({ error: 'URL must be a LinkedIn URL' }, { status: 400 });
  }

  console.log(`[scrape] Fetching: ${postUrl}`);

  // ── Strategy 1: Direct HTTP fetch
  try {
    console.log('[scrape] Trying direct HTTP fetch…');
    const result = await fetchDirect(postUrl);
    if (result?.content) {
      console.log('[scrape] ✅ Direct fetch succeeded');
      return Response.json({ ...result, success: true, strategy: 'direct' });
    }
  } catch (e) {
    console.log('[scrape] Direct fetch failed:', e.message);
  }

  // ── Strategy 2: Puppeteer
  try {
    console.log('[scrape] Trying Puppeteer headless Chrome…');
    const result = await fetchWithPuppeteer(postUrl);
    if (result?.authWall) {
      return Response.json({
        success: false,
        authWall: true,
        error:
          'LinkedIn requires you to be logged in to view this post. Please log in to LinkedIn in Chrome first, then try again.',
        strategy: 'puppeteer',
      });
    }
    if (result?.content) {
      console.log('[scrape] ✅ Puppeteer succeeded');
      return Response.json({ ...result, success: true, strategy: 'puppeteer' });
    }
  } catch (e) {
    console.log('[scrape] Puppeteer failed:', e.message);
  }

  // ── Strategy 3: Google Cache
  try {
    console.log('[scrape] Trying Google Cache…');
    const result = await fetchGoogleCache(postUrl);
    if (result?.content) {
      console.log('[scrape] ✅ Google cache succeeded');
      return Response.json({ ...result, success: true, strategy: 'cache' });
    }
  } catch (e) {
    console.log('[scrape] Google cache failed:', e.message);
  }

  // ── All failed
  return Response.json({
    success: false,
    error:
      'Could not read post content automatically. LinkedIn may require login or is blocking access. Please paste the content manually.',
    strategy: 'none',
  });
}
