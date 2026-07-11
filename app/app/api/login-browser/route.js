/**
 * /api/login-browser
 *
 * Launches a headful (visible) Google Chrome instance using our local Chrome profile
 * so the user can log into LinkedIn. Once logged in, their session cookies are
 * saved in the profile and subsequent headless scraping requests will work.
 */

import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE_DIR = path.join(process.cwd(), '.chrome-profile');

export async function GET(request) {
  console.log('[login-browser] Launching Chrome to log into LinkedIn...');
  console.log('[login-browser] Profile path:', PROFILE_DIR);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: false, // Make it visible so the user can interact
      defaultViewport: null, // Allow custom sizing
      userDataDir: PROFILE_DIR,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1024,768',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const page = await browser.newPage();
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

    // Keep the browser open until the user closes it manually,
    // or until they successfully navigate to the feed/home page indicating login success.
    // We will poll to see if the browser is closed or if url contains feed.
    return new Response(
      new ReadableStream({
        async start(controller) {
          controller.enqueue('Chrome window opened. Please log in.\n');

          const interval = setInterval(async () => {
            try {
              const pages = await browser.pages();
              if (pages.length === 0) {
                clearInterval(interval);
                await browser.close().catch(() => {});
                controller.enqueue('Browser closed by user.\n');
                controller.close();
                return;
              }

              // Check current URL of the active page
              const currentUrl = page.url();
              if (currentUrl.includes('linkedin.com/feed') || currentUrl.includes('linkedin.com/mynetwork')) {
                clearInterval(interval);
                controller.enqueue('✅ Login detected! You can close the Chrome window now.\n');
                // Give them a moment to see the success before closing
                setTimeout(async () => {
                  await browser.close().catch(() => {});
                  controller.close();
                }, 3000);
              }
            } catch (err) {
              clearInterval(interval);
              await browser.close().catch(() => {});
              controller.enqueue(`Error checking browser status: ${err.message}\n`);
              controller.close();
            }
          }, 1000);
        }
      }),
      {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      }
    );

  } catch (err) {
    console.error('[login-browser] Error:', err.message);
    if (browser) await browser.close().catch(() => {});
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
