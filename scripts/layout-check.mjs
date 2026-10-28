// Layout check: mounts every menu screen and resizes through real phone viewports
// (portrait + landscape), reduced browser chrome, simulated safe-area insets and 130% text.
// Fails if two visible UI elements intersect or any element leaves the viewport.
// Usage: npm run build && node scripts/layout-check.mjs [--shots dir] [--json file]
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const shotsDir = opt("--shots"), jsonOut = opt("--json");
const root = resolve(opt("--dist") || "dist");
if (!existsSync(join(root, "index.html"))) { console.error("dist/ missing: run npm run build first"); process.exit(2); }
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

export const PHONES = [
  ["se", 375, 667], ["iphone14", 390, 844], ["promax", 430, 932],
  ["pixel7", 412, 915], ["galaxys8", 360, 740], ["small", 320, 568],
];
const VARIANTS = {
  base: "",
  chrome: "", // viewport shrunk by browser UI, applied below
  notch: ":root{--safe-top:47px!important;--safe-bottom:34px!important}",
  notchLand: ":root{--safe-left:47px!important;--safe-right:47px!important;--safe-bottom:21px!important}",
  text130: "", // applied by scaleText(): every computed font-size x1.3, like Android/Chrome text scaling
};
function layouts() {
  const out = [];
  for (const [name, w, h] of PHONES) {
    for (const orient of ["portrait", "landscape"]) {
      const [W, H] = orient === "portrait" ? [w, h] : [h, w];
      const chromeCut = orient === "portrait" ? 136 : 56; // address bar + toolbar visible (100dvh < 100vh)
      out.push({ id: `${name}-${orient}`, W, H, variant: "base" });
      out.push({ id: `${name}-${orient}-chrome`, W, H: H - chromeCut, variant: "chrome" });
      out.push({ id: `${name}-${orient}-notch`, W, H, variant: orient === "portrait" ? "notch" : "notchLand" });
      out.push({ id: `${name}-${orient}-text130`, W, H, variant: "text130" });
    }
  }
  return out;
}

const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".woff": "font/woff", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".ico": "image/x-icon" };
const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p.startsWith("/shatterhymn")) p = p.slice("/shatterhymn".length) || "/";
  if (p === "/") p = "/index.html";
  const file = join(root, p);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/shatterhymn/?qa=1`;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
});
const save = (tutorialDone) => ({
  v: 1,
  settings: { sfx: 0, music: 0, vibration: false, reduceMotion: true, slowDial: false, shake: 0, tips: false },
  progress: { lifetimeShards: 420, lifetimeChoirs: 2, lifetimeCrystals: 200, runs: 12, daysPlayed: 3, lastPlayedDate: null, tutorialDone, seenTips: [], seenKinds: ["normal", "geode", "prism"] },
  bests: { score: 18420, biggestN: 9, longestStreak: 14, longestTimeMs: 200000 },
  daily: {}, missions: { date: null, ids: [], progress: {}, done: [], bonusGiven: false },
  unlocks: { skins: ["clear", "quartz"], scales: ["bright", "dusk"], titles: ["novice", "chorister"] },
  equipped: { skin: "clear", scale: "bright", title: "chorister" },
});

// In-page geometry audit.
function audit() {
  const W = innerWidth, H = innerHeight;
  const visible = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return false;
      if (n.hidden) return false;
    }
    return true;
  };
  const overlays = [...document.querySelectorAll(".pause-overlay, .screen-overlay")].filter(visible);
  // With a menu/pause overlay up, audit that overlay plus anything that can still paint above it
  // (the colour pad is position:fixed in #app). Without one, audit the whole HUD + title + pad.
  const pads = [...document.querySelectorAll(".color-pad")].filter(visible);
  const scope = overlays.length ? [overlays[overlays.length - 1], ...pads] : [...document.querySelectorAll("#screens, #hud"), ...pads];
  const ownText = (el) => [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
  const SKIP = ".pop-text, .popup, .floater, .pips, .pips *, .hearts svg, .result-progress *, .hymn-line *, .color-pad-hint";
  const cands = [];
  for (const s of scope) for (const el of s.querySelectorAll("*")) {
    if (el.matches(SKIP) || el.closest("svg")) continue;
    const tag = el.tagName;
    if (!(tag === "BUTTON" || tag === "INPUT" || ownText(el) || el.matches(".hearts, .next-chip, .score, .badge, .dot"))) continue;
    if (!visible(el)) continue;
    let r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    // clip by scrolling/overflow ancestors
    let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom, clipped = false;
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY)) {
        const c = n.getBoundingClientRect();
        x0 = Math.max(x0, c.left); y0 = Math.max(y0, c.top); x1 = Math.min(x1, c.right); y1 = Math.min(y1, c.bottom); clipped = true;
      }
    }
    if (x1 - x0 < 1 || y1 - y0 < 1) continue; // scrolled out of a scroller: reachable, fine
    const label = (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : "") || tag.toLowerCase();
    const text = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 28);
    cands.push({ el, name: `${tag.toLowerCase()}${label.startsWith(".") ? label : ""}"${text}"`, r: { x0, y0, x1, y1 }, raw: r, clipped });
  }
  const problems = [];
  for (const c of cands) {
    const r = c.r;
    if (r.x0 < -1 || r.y0 < -1 || r.x1 > W + 1 || r.y1 > H + 1) problems.push({ kind: "offscreen", a: c.name, rect: [r.x0, r.y0, r.x1, r.y1].map(Math.round) });
  }
  // A word split across two lines ("Collecti / on") is unreadable even if nothing overlaps.
  for (const c of cands) {
    for (const node of c.el.childNodes) {
      if (node.nodeType !== 3) continue;
      for (const m of node.textContent.matchAll(/[^\s\-–—]+/g)) { // breaking at a hyphen is normal
        if (!/^[("'*_]*[A-Za-z][A-Za-z'’]{2,}[)"'*_.,:;!?]*$/.test(m[0])) continue; // plain words only; URLs/paths may wrap
        const range = document.createRange(); range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
        const tops = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
        if (tops.size > 1) problems.push({ kind: "broken-word", a: c.name, word: m[0] });
      }
    }
  }
  for (let i = 0; i < cands.length; i++) for (let j = i + 1; j < cands.length; j++) {
    const a = cands[i], b = cands[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    // badges intentionally sit on their own chip corner
    if ((a.el.matches(".badge,.dot") && a.el.parentElement === b.el.parentElement) || (b.el.matches(".badge,.dot") && b.el.parentElement === a.el.parentElement)) continue;
    const ox = Math.min(a.r.x1, b.r.x1) - Math.max(a.r.x0, b.r.x0), oy = Math.min(a.r.y1, b.r.y1) - Math.max(a.r.y0, b.r.y0);
    if (ox > 2 && oy > 2) problems.push({ kind: "overlap", a: a.name, b: b.name, px: [Math.round(ox), Math.round(oy)] });
  }
  return { W, H, count: cands.length, problems };
}

const SCREENS = (opt("--screens") || "title,settings,missions,collection,credits,howto,daily,pause,results").split(",");
async function openScreen(page, name) {
  const tut = name === "howto";
  await page.goto(base, { waitUntil: "load" });
  await page.evaluate((s) => localStorage.setItem("shatterhymn:save", JSON.stringify(s)), save(true));
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".title-screen", { timeout: 20000 });
  // dispatch (not a pointer click) so navigation works even when the layout is broken; the audit reports the overlap
  const click = async (sel) => { await page.locator(sel).first().dispatchEvent("click"); await page.waitForTimeout(300); };
  if (name === "settings") await click('.title-screen button[aria-label="Settings"]');
  if (name === "missions") await click(".title-screen .missions-chip");
  if (name === "collection") await click('.title-screen button[aria-label="Collection"]');
  if (name === "credits") { await click('.title-screen button[aria-label="Settings"]'); await click('.screen-panel button:has-text("Credits")'); }
  if (tut) { await click('.title-screen button[aria-label="Settings"]'); await click('.screen-panel button:has-text("How to play")'); await page.waitForTimeout(1500); }
  if (name === "daily" || name === "pause") { await click(".title-screen .daily"); await page.waitForTimeout(2500); }
  if (name === "pause") { await click(".pause-button"); await page.waitForTimeout(400); }
  if (name === "results") {
    await click(".title-screen .play-hero");
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.__shatterhymnQA.forceGameOver());
    await page.waitForSelector('button:has-text("Play again")', { timeout: 120000 });
    await page.waitForTimeout(3000);
  }
  await page.waitForTimeout(500);
}

const report = [];
let failures = 0;
for (const screen of SCREENS) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36" });
  const page = await context.newPage();
  try { await openScreen(page, screen); } catch (e) { console.error(`FAIL open ${screen}: ${e.message}`); failures++; await context.close(); continue; }
  for (const L of layouts()) {
    await page.setViewportSize({ width: L.W, height: L.H });
    await page.evaluate((css) => { let s = document.getElementById("__layout_variant"); if (!s) { s = document.createElement("style"); s.id = "__layout_variant"; document.head.append(s); } s.textContent = css; }, VARIANTS[L.variant]);
    await page.evaluate((on) => {
      for (const el of document.querySelectorAll("body *")) {
        if (el.dataset.lcFont !== undefined) { el.style.fontSize = el.dataset.lcFont; delete el.dataset.lcFont; }
      }
      if (!on) return;
      const sizes = [...document.querySelectorAll("body *")].map((el) => [el, parseFloat(getComputedStyle(el).fontSize)]);
      for (const [el, px] of sizes) { el.dataset.lcFont = el.style.fontSize; el.style.fontSize = `${(px * 1.3).toFixed(2)}px`; }
    }, L.variant === "text130");
    await page.waitForTimeout(250);
    const res = await page.evaluate(audit);
    const entry = { screen, layout: L.id, ...res };
    report.push(entry);
    if (res.problems.length) { failures++; console.log(`FAIL ${screen} @ ${L.id} (${L.W}x${L.H}): ${res.problems.length} problem(s)`); for (const p of res.problems.slice(0, 4)) console.log("   ", JSON.stringify(p)); }
    if (shotsDir) await page.screenshot({ path: join(shotsDir, `${screen}--${L.id}.png`) });
  }
  await context.close();
}
await browser.close(); server.close();
const total = report.length, bad = report.filter((r) => r.problems.length).length;
console.log(`layout-check: ${total - bad}/${total} screen-layouts clean, ${bad} failing`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 1));
process.exit(failures ? 1 : 0);
