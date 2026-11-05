// Screenshot a URL with the locally installed Chrome (WebGL via SwiftShader/ANGLE).
// Usage: node shoot.mjs <url> <out.png> [width] [height] [--full] [--wait=ms] [--dark] [--scroll=y] [--eval=js]
import { chromium } from 'playwright-core';
const args = process.argv.slice(2);
const [url, out] = args;
const nums = args.slice(2).filter(a => /^\d+$/.test(a)).map(Number);
const opt = k => (args.find(a => a.startsWith('--' + k + '=')) || '').split('=').slice(1).join('=');
const width = nums[0] || 1440, height = nums[1] || 900;
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: args.includes('--dark') ? 'dark' : 'light' });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', r => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));
await page.goto(url, { waitUntil: 'load' });
if (opt('eval')) await page.evaluate(opt('eval'));
if (opt('scroll')) await page.evaluate(y => window.scrollTo(0, +y), opt('scroll'));
await page.waitForTimeout(+(opt('wait') || 2500));
await page.screenshot({ path: out, fullPage: args.includes('--full') });
console.log(logs.join('\n') || '(no console output)');
await browser.close();
