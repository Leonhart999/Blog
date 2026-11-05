// Crawl every internal link of the built site and report 4xx/5xx responses and page errors.
// Usage: node scripts/crawl.mjs [startUrl]
import { chromium } from 'playwright-core';

const start = process.argv[2] || 'http://127.0.0.1:4321/Blog/';
const origin = new URL(start).origin;
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const bad = [];
page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/nope/')) bad.push(`${r.status()} ${r.url()}`); });
page.on('pageerror', (e) => bad.push(`pageerror ${page.url()}: ${e.message}`));
const seen = new Set();
const queue = [start];
while (queue.length) {
  const u = queue.shift();
  if (seen.has(u)) continue;
  seen.add(u);
  await page.goto(u, { waitUntil: 'load' });
  const links = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
  for (const l of links) {
    const clean = l.split('#')[0];
    if (clean.startsWith(origin) && !seen.has(clean) && !clean.endsWith('.xml')) queue.push(clean);
  }
}
console.log('pages crawled:', seen.size);
console.log(bad.length ? bad.join('\n') : 'no 4xx/5xx responses, no page errors');
await browser.close();
