/**
 * Erzeugt die Store-Screenshots aus dem echten Spiel.
 *
 * Aufruf (Web-Build muss laufen, siehe premium-audit.js):
 *   node scripts/store-screenshots.js http://localhost:8130/ store/screenshots
 * Nach einer Umbenennung oder Designänderung einfach erneut ausführen.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [BASIS, ZIEL] = process.argv.slice(2);
const GERAETE = {
  iphone: { w: 440, h: 956, dpr: 3 },   // 1320 × 2868
  ipad: { w: 1032, h: 1376, dpr: 2 },   // 2064 × 2752
  android: { w: 360, h: 780, dpr: 3 },  // 1080 × 2340
};
const TEXTE = {
  de: ['Ein Rätsel am Tag.\nFür alle gleich.', 'Drei gleiche verschmelzen.\nKetten zählen vielfach.', 'Teile dein Ergebnis –\nohne zu spoilern.', 'Ohne Werbung, ohne Konto.\nAuch offline.'],
  en: ['One puzzle a day.\nThe same for everyone.', 'Match three to merge.\nChains multiply.', 'Share your result –\nno spoilers.', 'No ads. No account.\nNo internet needed.'],
};
const leer = () => Array.from({ length: 8 }, () => Array(5).fill(0));
const stand = (o) => JSON.stringify({ mode: 'endless', moveLimit: null, board: leer(), queue: [3, 1, 2], score: 2480, bestChain: 3, highestLevel: 4, prismas: 1, moves: 40, over: false, puzzleNumber: null, seed: 7, rngCalls: 43, ...o });
const EINST = JSON.stringify({ theme: 'dark', haptics: true, sound: false, colorAssist: true, tutorialDone: true });
const nr = () => { const d = new Date(); return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 864e5) + 1; };
const brett = () => { const b = leer(); [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,4,0,0],[0,0,3,0,0],[0,2,3,0,0],[1,2,4,0,5],[2,1,3,3,4]].forEach((r,i)=>r.forEach((v,c)=>b[i][c]=v)); return b; };

async function seite(browser, g, sprache, speicher) {
  const ctx = await browser.newContext({ viewport: { width: g.w, height: g.h }, deviceScaleFactor: g.dpr, locale: sprache === 'de' ? 'de-DE' : 'en-US', colorScheme: 'dark' });
  await ctx.addInitScript((e) => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.clear(); for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v); }, { 'prisma.settings.v1': EINST, ...speicher });
  const page = await ctx.newPage();
  await page.goto(BASIS, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const spalte = (page, c) => page.getByRole('button', { name: new RegExp(`^(Spalte|Column) ${c + 1}\\b`) }).boundingBox();

async function roh(browser, g, sprache, dir) {
  const bilder = [];
  // 1 Tagesrätsel, Zielen gehalten
  let { ctx, page } = await seite(browser, g, sprache, { 'prisma.save.daily.v1': stand({ mode: 'daily', moveLimit: 90, moves: 31, puzzleNumber: nr(), board: brett(), score: 1840 }) });
  await page.getByText(/^(Tagesrätsel|Daily)$/).first().click(); await page.waitForTimeout(900);
  let b = await spalte(page, 3); await page.mouse.move(b.x + b.width / 2, b.y + 80); await page.mouse.down(); await page.waitForTimeout(300);
  bilder.push(await page.screenshot()); await ctx.close();
  // 2 Kette im Flug
  const k = leer(); k[6][0] = 2; k[6][1] = 2; k[7][0] = 1; k[7][1] = 1; k[7][3] = 4; k[7][4] = 3; k[6][4] = 5;
  ({ ctx, page } = await seite(browser, g, sprache, { 'prisma.save.v1': stand({ board: k, queue: [1, 2, 3], score: 3150 }) }));
  await page.getByText(/^(Fortsetzen|Resume)$/).first().click(); await page.waitForTimeout(900);
  b = await spalte(page, 2); await page.mouse.click(b.x + b.width / 2, b.y + 80); await page.waitForTimeout(640);
  bilder.push(await page.screenshot()); await ctx.close();
  // 3 Ergebnis mit Rekord
  const v = leer(); for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) v[r][c] = r < 2 ? 0 : ((r * 2 + c * 3) % 5) + 1; v[1][4] = 0;
  for (let r = 2; r < 8; r++) for (let c = 0; c < 5; c++) v[r][c] = (r + c) % 2 ? 1 : 2; for (let c = 0; c < 5; c++) v[0][c] = (c % 2) ? 4 : 3; for (let c = 0; c < 5; c++) v[1][c] = (c % 2) ? 3 : 4; v[0][4] = 0;
  ({ ctx, page } = await seite(browser, g, sprache, { 'prisma.save.v1': stand({ board: v, queue: [2, 1, 1], score: 6340, bestChain: 5, prismas: 2 }) }));
  await page.getByText(/^(Fortsetzen|Resume)$/).first().click(); await page.waitForTimeout(800);
  b = await spalte(page, 4); await page.mouse.click(b.x + b.width / 2, b.y + 40); await page.waitForTimeout(2600);
  bilder.push(await page.screenshot()); await ctx.close();
  // 4 Startbildschirm
  ({ ctx, page } = await seite(browser, g, sprache, { 'prisma.stats.v1': JSON.stringify({ played: 30, totalScore: 99000, bestScore: { daily: 5200, endless: 9000, zen: 0 }, bestChain: 6, prismas: 12, streak: 12, longestStreak: 12, lastDailyPuzzle: nr() - 1, daily: {} }) }));
  await page.waitForTimeout(1200);
  bilder.push(await page.screenshot()); await ctx.close();
  return bilder;
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  // Schrift eingebettet: Eine Datei-Adresse lädt der Browser in einer leeren Seite nicht.
  const schrift = 'data:font/ttf;base64,' + fs.readFileSync(require.resolve('@expo-google-fonts/outfit/800ExtraBold/Outfit_800ExtraBold.ttf')).toString('base64');
  for (const sprache of ['de', 'en']) for (const [name, g] of Object.entries(GERAETE)) {
    const dir = path.join(ZIEL, sprache, name); fs.mkdirSync(dir, { recursive: true });
    const bilder = await roh(browser, g, sprache, dir);
    const ctx = await browser.newContext({ viewport: { width: g.w, height: g.h }, deviceScaleFactor: g.dpr });
    const p = await ctx.newPage();
    for (let i = 0; i < bilder.length; i++) {
      const titel = TEXTE[sprache][i].replace('\n', '<br>');
      await p.setContent(`<style>@font-face{font-family:O;src:url(${schrift})}
        body{margin:0;width:${g.w}px;height:${g.h}px;overflow:hidden;background:radial-gradient(circle at 30% 10%,#1d2a4a,#080B11 70%);font-family:O,sans-serif;display:flex;flex-direction:column;align-items:center}
        h1{color:#F2F5FA;font-size:${Math.round(Math.min(g.w * 0.068, 64))}px;line-height:1.15;text-align:center;margin:${g.h * 0.055}px 20px ${g.h * 0.035}px;letter-spacing:-0.5px}
        img{width:${g.w * 0.8}px;border-radius:${g.w * 0.07}px;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 2px rgba(255,255,255,.08)}
        .band{position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#FF4D6A,#FF9038,#FFD23F,#3ED598,#4D9BFF)}</style>
        <div class=band></div><h1>${titel}</h1><img src="data:image/png;base64,${bilder[i].toString('base64')}">`);
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(150);
      await p.screenshot({ path: path.join(dir, `${i + 1}.png`) });
    }
    await ctx.close();
    console.log(`${sprache}/${name}: ${bilder.length} Bilder`);
  }
  await browser.close();
})();
