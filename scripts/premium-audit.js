/**
 * Irisa Premium-Prüfstand.
 *
 * Prüft die zwölf Ziele der Premium-Checkliste gegen den echten Web-Build.
 * Spielstände werden vor dem Laden in localStorage gelegt (dort speichert die
 * Web-Fassung), damit volle Spalten, Spielende und erledigte Tagesrätsel
 * reproduzierbar sind statt vom Zufall abzuhängen.
 *
 * Aufruf:
 *   npx expo export --platform web --output-dir dist
 *   npx serve dist -l 8110            (oder ein beliebiger statischer Server)
 *   npm i --no-save playwright && npx playwright install chromium
 *   node scripts/premium-audit.js http://localhost:8110/ [nur=1,2,5]
 *
 * Ein bereits installiertes Chromium lässt sich über CHROMIUM_PATH angeben.
 * Jede Änderung am Spiel sollte hier alle Ziele weiter erreichen.
 */
const { chromium } = require('playwright');

const BASIS = process.argv[2] || 'http://localhost:8110/';
const NUR = (process.argv.find((a) => a.startsWith('nur=')) || '').slice(4).split(',').filter(Boolean).map(Number);

const ROWS = 8, COLS = 5;
const ALLE_FEHLER = [];
const leer = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));
const heute = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const raetselNr = () => {
  const d = new Date();
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.floor((t - new Date(2026, 0, 1).getTime()) / 86400000) + 1;
};

function spielstand(over = {}) {
  return {
    mode: 'endless', moveLimit: null, board: leer(), queue: [1, 2, 1],
    score: 0, bestChain: 0, highestLevel: 1, prismas: 0, moves: 10,
    over: false, puzzleNumber: null, seed: 12345, rngCalls: 13, ...over,
  };
}

const TUTORIAL_ERLEDIGT = { theme: 'auto', haptics: true, sound: true, colorAssist: true, tutorialDone: true };

async function neueSeite(browser, { speicher = {}, schema = 'dark', bewegung = 'no-preference', sprache = 'de-DE', erster = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 }, colorScheme: schema, reducedMotion: bewegung,
    locale: sprache, permissions: ['clipboard-read', 'clipboard-write'],
  });
  const eintraege = erster ? speicher : { 'prisma.settings.v1': JSON.stringify(TUTORIAL_ERLEDIGT), ...speicher };
  await ctx.addInitScript((e) => {
    if (sessionStorage.getItem('__init')) return;
    sessionStorage.setItem('__init', '1');
    localStorage.clear();
    for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v);
  }, eintraege);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => ALLE_FEHLER.push(e.message.slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') ALLE_FEHLER.push(m.text().slice(0, 160)); });
  await page.goto(BASIS, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  return { ctx, page };
}

const spalte = (page, c) => page.getByRole('button', { name: new RegExp(`^(Spalte|Column) ${c + 1}\\b`) });
const text = (page) => page.evaluate(() => document.body.innerText);
const zuegeUebrig = async (page) => {
  const t = await page.locator('[data-testid="moves-left"]').first().textContent().catch(() => null);
  return t === null ? null : Number(t.replace(/\D/g, ''));
};
async function klickeSpalte(page, c) {
  const box = await spalte(page, c).boundingBox();
  if (!box) throw new Error(`Spalte ${c + 1} nicht gefunden`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.6);
}

const PRUEFUNGEN = [
  [1, 'Zielen mit Landevorschau', async (b) => {
    const { ctx, page } = await neueSeite(b);
    await page.getByText(/^(Endlos|Endless)$/).first().click();
    await page.waitForTimeout(700);
    const b2 = await spalte(page, 1).boundingBox();
    const b4 = await spalte(page, 3).boundingBox();
    if (!b2 || !b4) { await ctx.close(); return [false, 'Spalten nicht auffindbar']; }
    await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height * 0.3);
    await page.mouse.down();
    await page.waitForTimeout(120);
    const g1 = await page.locator('[data-testid="ghost"]').boundingBox().catch(() => null);
    await page.mouse.move(b4.x + b4.width / 2, b4.y + b4.height * 0.3, { steps: 6 });
    await page.waitForTimeout(120);
    const g2 = await page.locator('[data-testid="ghost"]').boundingBox().catch(() => null);
    await page.mouse.up();
    await page.waitForTimeout(600);
    const label = await spalte(page, 3).getAttribute('aria-label');
    await ctx.close();
    if (!g1) return [false, 'keine Vorschau beim Halten'];
    if (!g2 || Math.abs(g2.x + g2.width / 2 - (b4.x + b4.width / 2)) > b4.width / 2) return [false, 'Vorschau folgt dem Finger nicht'];
    if (!/7 (frei|free)/.test(label || '')) return [false, `Stein nicht in gezielter Spalte gelandet (${label})`];
    return [true, 'Vorschau erscheint, folgt dem Finger, Stein landet dort'];
  }],

  [2, 'Keine Eingabe geht verloren', async (b) => {
    const { ctx, page } = await neueSeite(b);
    await page.getByText(/^(Tagesrätsel|Daily)$/).first().click();
    await page.waitForTimeout(700);
    const vorher = await zuegeUebrig(page);
    await klickeSpalte(page, 0);
    await page.waitForTimeout(60);
    await klickeSpalte(page, 4);
    await page.waitForTimeout(60);
    await klickeSpalte(page, 2);
    await page.waitForTimeout(2200);
    const nachher = await zuegeUebrig(page);
    await ctx.close();
    if (vorher === null) return [false, 'Zugzähler nicht auffindbar'];
    const gezaehlt = vorher - nachher;
    return [gezaehlt === 3, `${gezaehlt} von 3 schnellen Zügen gezählt`];
  }],

  [3, 'Rückmeldung bei voller Spalte', async (b) => {
    const brett = leer();
    for (let r = 0; r < ROWS; r++) brett[r][0] = r % 2 ? 1 : 2;
    const { ctx, page } = await neueSeite(b, { speicher: { 'prisma.save.v1': JSON.stringify(spielstand({ board: brett })) } });
    await page.getByText(/^(Fortsetzen|Resume)$/).first().click();
    await page.waitForTimeout(700);
    await klickeSpalte(page, 0);
    await page.waitForTimeout(90);
    const sichtbar = await page.locator('[data-testid="reject"]').count();
    await ctx.close();
    return [sichtbar > 0, sichtbar ? 'volle Spalte wird sichtbar abgewiesen' : 'Tipp verpufft ohne Rückmeldung'];
  }],

  [4, 'Flüssig: keine Blockade über 50 ms', async (b) => {
    const { ctx, page } = await neueSeite(b);
    await page.getByText(/^(Endlos|Endless)$/).first().click();
    await page.waitForTimeout(900);
    await page.evaluate(() => {
      window.__lange = [];
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lange.push(e.duration))).observe({ type: 'longtask', buffered: false });
    });
    const belegt = () => page.evaluate(() => [...document.querySelectorAll('[aria-label^="Spalte"],[aria-label^="Column"]')]
      .reduce((n, el) => n + 8 - Number((el.getAttribute('aria-label').match(/(\d+) (frei|free)/) || [0, 8])[1]), 0));
    let zuege = 0;
    for (let i = 0; i < 30; i++) {
      const vor = await belegt();
      await klickeSpalte(page, [0, 1, 2, 1, 0, 3, 4, 3][i % 8]).catch(() => {});
      await page.waitForTimeout(260);
      if ((await belegt()) !== vor) zuege++;
    }
    await page.waitForTimeout(800);
    const lange = await page.evaluate(() => window.__lange);
    const punkte = Number(((await text(page)).match(/\n([\d.,]+)\n/) || [0, '0'])[1].replace(/\D/g, ''));
    await ctx.close();
    const max = lange.length ? Math.max(...lange) : 0;
    const echt = zuege >= 20 && punkte > 0;
    return [max <= 50 && echt, `${zuege} Züge mit Wirkung, ${punkte} Punkte; ${lange.length} Blockaden über 50 ms, längste ${Math.round(max)} ms`];
  }],

  [5, 'Wortloses Tutorial beim ersten Start', async (b) => {
    const { ctx, page } = await neueSeite(b, { erster: true });
    const tut = page.locator('[data-testid="tutorial"]');
    if (!(await tut.count())) { await ctx.close(); return [false, 'kein Tutorial beim ersten Start']; }
    const t = await tut.innerText();
    const buchstaben = (t.match(/\p{L}/gu) || []).length;
    for (let schritt = 0; schritt < 3; schritt++) {
      const hinweis = await page.locator('[data-testid="tap-hint"]').boundingBox().catch(() => null);
      if (!hinweis) { await ctx.close(); return [false, `kein Tipp-Hinweis in Schritt ${schritt + 1}`]; }
      await page.mouse.click(hinweis.x + hinweis.width / 2, hinweis.y + hinweis.height / 2);
      await page.waitForTimeout(2600);
    }
    await page.waitForTimeout(1500);
    const zuHause = await page.locator('[data-testid="screen-home"]').count();
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const wieder = await page.locator('[data-testid="tutorial"]').count();
    await ctx.close();
    if (buchstaben > 0) return [false, `Tutorial enthält ${buchstaben} Buchstaben Text`];
    if (!zuHause) return [false, 'nach drei Schritten nicht im Menü'];
    if (wieder) return [false, 'Tutorial erscheint erneut'];
    return [true, 'erscheint beim ersten Start, ohne Text, in drei Schritten durchspielbar, danach nie wieder'];
  }],

  [6, 'Tagesrätsel unbestechlich', async (b) => {
    // a) Abbrechen und neu tippen muss fortsetzen, nicht neu starten.
    let { ctx, page } = await neueSeite(b);
    await page.getByText(/^(Tagesrätsel|Daily)$/).first().click();
    await page.waitForTimeout(700);
    for (let i = 0; i < 4; i++) { await klickeSpalte(page, i); await page.waitForTimeout(700); }
    const vor = await zuegeUebrig(page);
    await page.getByRole('button', { name: /^(Menü|Menu)$/ }).first().click();
    await page.waitForTimeout(700);
    await page.getByText(/^(Tagesrätsel|Daily)$/).first().click();
    await page.waitForTimeout(700);
    const nach = await zuegeUebrig(page);
    await ctx.close();
    if (vor === null || nach !== vor) return [false, `Neustart statt Fortsetzen (${vor} → ${nach} Züge übrig)`];
    // b) Erledigtes Rätsel zeigt das Ergebnis statt einer neuen Partie.
    const stats = {
      played: 1, totalScore: 4200, bestScore: { daily: 4200, endless: 0, zen: 0 }, bestChain: 3, prismas: 1,
      streak: 1, longestStreak: 1, lastDailyKey: heute(),
      daily: { [heute()]: { score: 4200, chain: 3, prismas: 1, moves: 90, puzzle: raetselNr(), board: leer() } },
    };
    ({ ctx, page } = await neueSeite(b, { speicher: { 'prisma.stats.v1': JSON.stringify(stats) } }));
    await page.getByText(/^(Tagesrätsel|Daily)$/).first().click();
    await page.waitForTimeout(900);
    const ergebnis = await page.locator('[data-testid="result-sheet"]').count();
    const neuesSpiel = await zuegeUebrig(page);
    await ctx.close();
    if (!ergebnis || neuesSpiel === 90) return [false, 'erledigtes Rätsel lässt sich neu spielen'];
    return [true, 'setzt laufendes Rätsel fort, erledigtes zeigt das Ergebnis'];
  }],

  [7, 'Weiche Übergänge', async (b) => {
    const { ctx, page } = await neueSeite(b);
    await page.evaluate(() => {
      window.__deckkraft = [];
      const t0 = performance.now();
      const miss = () => {
        const el = document.querySelector('[data-testid="screen-game"]');
        if (el) window.__deckkraft.push(Number(getComputedStyle(el).opacity));
        if (performance.now() - t0 < 1500) requestAnimationFrame(miss);
      };
      requestAnimationFrame(miss);
    });
    await page.getByText(/^(Endlos|Endless)$/).first().click();
    await page.waitForTimeout(900);
    const werte = await page.evaluate(() => window.__deckkraft);
    await ctx.close();
    const zwischen = werte.filter((v) => v > 0.02 && v < 0.98).length;
    return [zwischen >= 3, zwischen ? `Einblendung über ${zwischen} Bilder` : 'harter Schnitt'];
  }],

  [8, 'Ergebnis als Höhepunkt', async (b) => {
    const brett = leer();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) brett[r][c] = (r + c) % 2 ? 1 : 2;
    brett[0][4] = 0;
    const { ctx, page } = await neueSeite(b, { speicher: { 'prisma.save.v1': JSON.stringify(spielstand({ board: brett, queue: [2, 1, 1], score: 3200 })) } });
    await page.getByText(/^(Fortsetzen|Resume)$/).first().click();
    await page.waitForTimeout(700);
    await klickeSpalte(page, 4);
    await page.waitForTimeout(900);
    const sheet = page.locator('[data-testid="result-sheet"]');
    if (!(await sheet.count())) { await ctx.close(); return [false, 'kein Ergebnisfenster']; }
    const zwischenstand = await page.locator('[data-testid="result-score"]').textContent().catch(() => '');
    await page.waitForTimeout(1600);
    const endstand = await page.locator('[data-testid="result-score"]').textContent().catch(() => '');
    const steine = await page.locator('[data-testid="result-stone"]').count();
    const feier = await page.locator('[data-testid="confetti"]').count();
    const emoji = /[🟥🟧🟨🟩🟦⬛]/u.test(await sheet.innerText());
    await ctx.close();
    const maengel = [];
    if (!steine) maengel.push('keine echten Steine');
    if (emoji) maengel.push('Emoji-Text sichtbar');
    if (zwischenstand === endstand) maengel.push('Punkte zählen nicht hoch');
    if (!feier) maengel.push('keine Rekordfeier');
    return [!maengel.length, maengel.join(', ') || `${steine} Steine, Punkte zählen hoch, Rekordfeier`];
  }],

  [9, 'Warnung bei fast voller Spalte', async (b) => {
    const brett = leer();
    for (let r = 2; r < ROWS; r++) brett[r][2] = r % 2 ? 3 : 4;
    const { ctx, page } = await neueSeite(b, { speicher: { 'prisma.save.v1': JSON.stringify(spielstand({ board: brett })) } });
    await page.getByText(/^(Fortsetzen|Resume)$/).first().click();
    await page.waitForTimeout(800);
    const gefahr = await page.locator('[data-testid="danger-2"]').count();
    const fehlalarm = await page.locator('[data-testid="danger-0"]').count();
    await ctx.close();
    return [gefahr > 0 && !fehlalarm, gefahr ? (fehlalarm ? 'Fehlalarm auf leerer Spalte' : 'fast volle Spalte warnt, leere nicht') : 'keine Warnung'];
  }],

  [10, 'Echte Symbole statt Textzeichen', async (b) => {
    const { ctx, page } = await neueSeite(b);
    const funde = new Set();
    const pruefe = async () => { for (const z of (await text(page)).match(/[‹›✕✓★◈]/gu) || []) funde.add(z); };
    await pruefe();
    await page.getByText(/^(Endlos|Endless)$/).first().click();
    await page.waitForTimeout(700);
    await pruefe();
    await ctx.close();
    return [!funde.size, funde.size ? `Textzeichen gefunden: ${[...funde].join(' ')}` : 'nur gezeichnete Symbole'];
  }],

  [11, 'Barrierefreiheit', async (b) => {
    // a) Reduzierte Bewegung: Prisma ohne Erschütterung und Blitz.
    const brett = leer();
    brett[7][1] = 5; brett[7][2] = 5;
    let { ctx, page } = await neueSeite(b, { bewegung: 'reduce', speicher: { 'prisma.save.v1': JSON.stringify(spielstand({ board: brett, queue: [5, 1, 1] })) } });
    await page.getByText(/^(Fortsetzen|Resume)$/).first().click();
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      window.__bewegt = 0;
      const t0 = performance.now();
      const miss = () => {
        const s = document.querySelector('[data-testid="shake-layer"]');
        const f = document.querySelector('[data-testid="flash-layer"]');
        if (s && /matrix|translate/.test(getComputedStyle(s).transform) && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(getComputedStyle(s).transform)) window.__bewegt++;
        if (f && Number(getComputedStyle(f).opacity) > 0.05) window.__bewegt++;
        if (performance.now() - t0 < 1500) requestAnimationFrame(miss);
      };
      requestAnimationFrame(miss);
    });
    await klickeSpalte(page, 3);
    await page.waitForTimeout(1600);
    const bewegt = await page.evaluate(() => window.__bewegt);
    await ctx.close();
    // b) Vorlesetexte in der Gerätesprache.
    ({ ctx, page } = await neueSeite(b, { sprache: 'en-US' }));
    await page.getByText(/^Endless$/).first().click();
    await page.waitForTimeout(700);
    const englisch = await page.getByRole('button', { name: /^Column 1\b/ }).count();
    await ctx.close();
    const maengel = [];
    if (bewegt) maengel.push(`${bewegt} bewegte Bilder trotz reduzierter Bewegung`);
    if (!englisch) maengel.push('Vorlesetexte nicht übersetzt');
    return [!maengel.length, maengel.join(', ') || 'reduzierte Bewegung respektiert, Vorlesetexte übersetzt'];
  }],

  [12, 'Teilen funktioniert überall', async (b) => {
    const brett = leer();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) brett[r][c] = (r + c) % 2 ? 1 : 2;
    brett[0][4] = 0;
    const { ctx, page } = await neueSeite(b, { speicher: { 'prisma.save.v1': JSON.stringify(spielstand({ board: brett, queue: [2, 1, 1] })) } });
    await page.evaluate(() => { try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); } catch {} });
    await page.getByText(/^(Fortsetzen|Resume)$/).first().click();
    await page.waitForTimeout(700);
    await klickeSpalte(page, 4);
    await page.waitForTimeout(1800);
    await page.getByRole('button', { name: /(Ergebnis teilen|Share result)/ }).first().click().catch(() => {});
    await page.waitForTimeout(500);
    const ablage = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    await ctx.close();
    return [/IRISA/.test(ablage), /IRISA/.test(ablage) ? 'Ergebnis landet in der Zwischenablage' : 'Knopf ohne Wirkung'];
  }],
];

PRUEFUNGEN.push(
  [13, 'Verlassen im letzten Zug kostet nichts', async (b) => {
    // Tagesrätsel beim 89. Zug, der 90. beendet es. Sofort danach Menü.
    const brett = leer();
    const n = raetselNr();
    const { ctx, page } = await neueSeite(b, {
      speicher: { 'prisma.save.daily.v1': JSON.stringify(spielstand({ mode: 'daily', moveLimit: 90, moves: 89, puzzleNumber: n, board: brett, score: 777 })) },
    });
    await page.getByText(/^(Tagesrätsel|Daily)$/).first().click();
    await page.waitForTimeout(700);
    await klickeSpalte(page, 2);
    await page.waitForTimeout(60);
    await page.getByRole('button', { name: /^(Menü|Menu)$/ }).first().click();
    await page.waitForTimeout(900);
    const ergebnis = await page.locator('[data-testid="result-sheet"]').count();
    const stats = JSON.parse(await page.evaluate(() => localStorage.getItem('prisma.stats.v1') || '{}'));
    await page.getByRole('button', { name: /^(Menü|Menu)$/ }).first().click().catch(() => {});
    await page.waitForTimeout(600);
    await page.getByText(/^(Tagesrätsel|Daily)$/).first().click();
    await page.waitForTimeout(800);
    const neuesSpiel = await zuegeUebrig(page);
    await ctx.close();
    const verbucht = !!(stats.daily && stats.daily[String(n)]);
    const maengel = [];
    if (!verbucht) maengel.push('Ergebnis nicht verbucht');
    if (!ergebnis) maengel.push('Ergebnis nicht gezeigt');
    if (neuesSpiel !== null) maengel.push('Rätsel erneut spielbar');
    return [!maengel.length, maengel.join(', ') || 'verbucht, im Menü gezeigt, nicht wiederholbar'];
  }],

  [14, 'Abbrechen im Zug nimmt ihn nicht zurück', async (b) => {
    const { ctx, page } = await neueSeite(b);
    await page.getByText(/^(Tagesrätsel|Daily)$/).first().click();
    await page.waitForTimeout(700);
    const vor = await zuegeUebrig(page);
    await klickeSpalte(page, 1);
    await page.waitForTimeout(40);
    await page.getByRole('button', { name: /^(Menü|Menu)$/ }).first().click();
    await page.waitForTimeout(700);
    await page.getByText(/^(Tagesrätsel|Daily)$/).first().click();
    await page.waitForTimeout(800);
    const nach = await zuegeUebrig(page);
    await ctx.close();
    return [nach === vor - 1, `vorher ${vor} Züge übrig, nach Abbruch und Rückkehr ${nach}`];
  }],

  [15, 'Zen löscht keine pausierte Endlos-Partie', async (b) => {
    const { ctx, page } = await neueSeite(b, { speicher: { 'prisma.save.v1': JSON.stringify(spielstand({ score: 4321 })) } });
    await page.getByText(/^Zen$/).first().click();
    await page.waitForTimeout(700);
    await klickeSpalte(page, 0);
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: /^(Menü|Menu)$/ }).first().click();
    await page.waitForTimeout(800);
    const endlos = JSON.parse(await page.evaluate(() => localStorage.getItem('prisma.save.v1') || 'null'));
    const knoepfe = await page.getByText(/^(Fortsetzen|Resume)$/).count();
    await ctx.close();
    const ok = endlos && endlos.mode === 'endless' && endlos.score === 4321 && knoepfe === 2;
    return [ok, ok ? 'beide Partien bleiben, zwei Fortsetzen-Knöpfe' : `Endlos: ${endlos ? endlos.score : 'weg'}, Knöpfe: ${knoepfe}`];
  }],

  [16, 'Startet auch ohne ladbare Schrift', async (b) => {
    const ctx = await b.newContext({ viewport: { width: 393, height: 852 } });
    await ctx.addInitScript((e) => { localStorage.setItem('prisma.settings.v1', e); }, JSON.stringify(TUTORIAL_ERLEDIGT));
    const page = await ctx.newPage();
    await page.route(/\.(ttf|otf)(\?.*)?$/, (r) => r.abort());
    await page.route(/^data:font/, (r) => r.abort()).catch(() => {});
    await page.goto(BASIS, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);
    const da = await page.locator('[data-testid="screen-home"]').count();
    await ctx.close();
    return [da > 0, da ? 'Menü erscheint mit Systemschrift' : 'schwarzer Bildschirm'];
  }],
);

PRUEFUNGEN.push([17, 'Speicher-Umzug überschreibt nichts', async (b) => {
  const { ctx, page } = await neueSeite(b, { speicher: {
    'prisma.save.v1': JSON.stringify(spielstand({ mode: 'zen', score: 111 })),
    'prisma.save.zen.v1': JSON.stringify(spielstand({ mode: 'zen', score: 999 })),
  } });
  await page.waitForTimeout(600);
  const zen = JSON.parse(await page.evaluate(() => localStorage.getItem('prisma.save.zen.v1') || 'null'));
  const alt = await page.evaluate(() => localStorage.getItem('prisma.save.v1'));
  await ctx.close();
  const ok = zen && zen.score === 999 && alt === null;
  return [ok, ok ? 'neuere Zen-Partie bleibt, alte Ablage geräumt' : `Zen: ${zen && zen.score}, alte Ablage: ${alt ? 'noch da' : 'leer'}`];
}]);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  let bestanden = 0, gesamt = 0;
  for (const [nr, name, fn] of PRUEFUNGEN) {
    if (NUR.length && !NUR.includes(nr)) continue;
    gesamt++;
    let ok = false, info = '';
    try { [ok, info] = await fn(browser); } catch (e) { info = 'Abbruch: ' + e.message.split('\n')[0].slice(0, 120); }
    if (ok) bestanden++;
    console.log(`${ok ? '✅' : '❌'} ${String(nr).padStart(2)} ${name.padEnd(36)} ${info}`);
  }
  console.log(`\n${bestanden} von ${gesamt} Zielen erreicht`);
  const eindeutig = [...new Set(ALLE_FEHLER)];
  console.log(eindeutig.length ? `\n⚠️  ${eindeutig.length} verschiedene Konsolenfehler:\n  ` + eindeutig.slice(0, 8).join('\n  ') : 'Keine Konsolenfehler in allen Läufen');
  await browser.close();
})();
