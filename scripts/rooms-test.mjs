// Interaction smoke test for the rooms: drives each toy in headless Chrome,
// saves screenshots to dev/, and prints page errors.
// Usage: node scripts/rooms-test.mjs [baseUrl]
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://127.0.0.1:4321/Blog';
const OUT = new URL('../dev/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror ${page.url()}: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()} ${page.url()}: ${m.text()}`); });
const shot = (name) => page.screenshot({ path: OUT + name + '.png' });
const ready = () => page.waitForSelector('.is-ready', { timeout: 15000 });
const log = (...a) => console.log(...a);

// home: click a pin and fly in
await page.goto(BASE + '/');
await ready();
await page.waitForTimeout(800);
await page.click('[data-spot="workshop"]');
await page.waitForTimeout(450);
await shot('t-home-fly');
await page.waitForURL('**/category/projects/', { timeout: 5000 }).then(() => log('home pin -> workshop: ok')).catch(() => log('home pin -> workshop: NO NAVIGATION'));

// workshop: drag the big gear, strike the anvil
await ready();
await page.waitForTimeout(600);
await page.mouse.move(1100, 350);
await page.mouse.down();
for (let i = 0; i < 30; i++) { await page.mouse.move(1100 - i * 12, 350 + Math.sin(i) * 20); await page.waitForTimeout(16); }
await page.mouse.up();
await page.waitForTimeout(1500);
for (let i = 0; i < 3; i++) { await page.click('#anvil-strike'); await page.waitForTimeout(700); }
await page.click('#anvil-strike');
await page.waitForTimeout(420);
await shot('t-workshop-strike');
log('workshop heat/count:', await page.textContent('#forge-heat'), await page.textContent('#anvil-count'));

// scriptorium: flip pages
await page.goto(BASE + '/category/tech/');
await ready();
await page.waitForTimeout(800);
await page.click('#codex-next');
await page.waitForTimeout(330);
await shot('t-codex-mid');
await page.waitForTimeout(900);
await shot('t-codex-spread1');
log('codex readout:', await page.textContent('#codex-page'));

// inn: roll dice
await page.goto(BASE + '/category/essays/');
await ready();
await page.waitForTimeout(800);
await page.click('#dice-roll');
await page.waitForTimeout(500);
await shot('t-dice-rolling');
await page.waitForSelector('#fate-card:not([hidden])', { timeout: 8000 }).then(() => log('dice: fate card shown')).catch(() => log('dice: NO FATE CARD'));
await page.waitForTimeout(400);
await shot('t-dice-fate');
await page.click('#fire-stoke');
await page.waitForTimeout(500);
await shot('t-inn-stoke');

// market: filter by a tag, forge a banner
await page.goto(BASE + '/tags/');
await ready();
await page.waitForTimeout(800);
const firstTag = await page.getAttribute('[data-tag-toggle]', 'data-tag-toggle');
await page.click('[data-tag-toggle]');
log('market filter', firstTag, '->', (await page.textContent('#tag-filter-status')).trim());
await page.fill('#herald-name', '何俊颉');
await page.click('#herald-forge');
await page.waitForTimeout(1600);
await shot('t-market-forged');
log('herald blazon:', await page.textContent('#herald-blazon'));

// archive: hover then click a book
await page.goto(BASE + '/archive/');
await ready();
await page.waitForTimeout(900);
const box = await page.locator('#room-stage').boundingBox();
log('archive stage', JSON.stringify(box));

// rookery: send a letter (mailto navigation is blocked by routing)
await page.route('mailto:*', (r) => r.abort());
await page.goto(BASE + '/about/');
await ready();
await page.waitForTimeout(900);
await page.fill('#letter-form input[name=name]', '测试');
await page.fill('#letter-form textarea[name=message]', '你好，庄园。');
await page.click('#letter-form button[type=submit]');
await page.waitForTimeout(1300);
await shot('t-raven-flying');

console.log(problems.length ? problems.join('\n') : 'no page errors or warnings');
await browser.close();
