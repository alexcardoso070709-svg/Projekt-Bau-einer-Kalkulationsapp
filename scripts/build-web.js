/**
 * Baut Irisa als installierbare Offline-Web-App.
 *
 *   node scripts/build-web.js
 *
 * Ergebnis:
 *   docs/spielen/          Web-App für GitHub Pages (iPhone: Safari → Teilen →
 *                          „Zum Home-Bildschirm"). Service Worker hält sie
 *                          nach dem ersten Öffnen komplett offline bereit.
 *   download/Irisa.html    Dieselbe App als eine einzige Datei zum Weitergeben.
 *
 * Alles steckt in einer HTML-Datei: Code, Schriften und Klänge sind
 * eingebettet. Dadurch spielt es keine Rolle, unter welchem Pfad die Seite
 * liegt (GitHub Pages hängt den Repo-Namen an), und der Offline-Cache muss nur
 * eine Handvoll Dateien halten.
 */
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const WURZEL = path.join(__dirname, '..');
const ZIEL = path.join(WURZEL, 'docs', 'spielen');
const DOWNLOAD = path.join(WURZEL, 'download', 'Irisa.html');
const HINTERGRUND = '#080B11';

const MIME = { '.wav': 'audio/wav', '.ttf': 'font/ttf', '.png': 'image/png', '.otf': 'font/otf' };

function exportiere() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'irisa-web-'));
  execFileSync('npx', ['expo', 'export', '-p', 'web', '--output-dir', ordner], { cwd: WURZEL, stdio: 'inherit' });
  return ordner;
}

function bettEin(ordner) {
  const jsOrdner = path.join(ordner, '_expo', 'static', 'js', 'web');
  const dateien = fs.readdirSync(jsOrdner).filter((d) => d.endsWith('.js'));
  if (dateien.length !== 1) throw new Error(`Genau ein Web-Bündel erwartet, gefunden: ${dateien.join(', ')}`);
  let js = fs.readFileSync(path.join(jsOrdner, dateien[0]), 'utf8');

  // Metro legt jede Datei als Modul `m.exports="/assets/…"` ab. Aus dem Pfad
  // wird eine data:-URI, damit die App ohne Server und unter jedem Pfad läuft.
  let ersetzt = 0;
  js = js.replace(/m\.exports="(\/assets\/[^"]+)"/g, (_, url) => {
    const datei = path.join(ordner, decodeURIComponent(url));
    const mime = MIME[path.extname(datei)];
    if (!mime) throw new Error(`Unbekannter Dateityp: ${url}`);
    ersetzt += 1;
    return `m.exports="data:${mime};base64,${fs.readFileSync(datei).toString('base64')}"`;
  });
  const rest = js.match(/"\/assets\/[^"]*"/);
  if (rest) throw new Error(`Nicht eingebettete Datei im Bündel: ${rest[0]}`);
  if (ersetzt === 0) throw new Error('Keine Dateien eingebettet — hat sich das Bündelformat geändert?');

  // Ein "</script" im Code würde das Skript-Tag vorzeitig schließen.
  return { js: js.replace(/<\/script/gi, '<\\/script'), ersetzt };
}

/**
 * Hilfsskript für den Browser, läuft vor dem Spiel.
 *
 * - iOS lässt ein Audio-Element erst klingen, nachdem es einmal während einer
 *   Berührung gestartet wurde. Klänge nach einer Animation kämen sonst nie an.
 *   Deshalb wird jedes Element bei der ersten Berührung stumm angespielt.
 *   Startet das Spiel denselben Klang währenddessen selbst, gewinnt das Spiel:
 *   Der Ton wird hörbar geschaltet und nicht wieder angehalten.
 * - audioSession „ambient" (Safari 16.4+) verhält sich wie die native App:
 *   Musik läuft weiter, und der Stummschalter wird respektiert.
 * - Der Service Worker macht die App offline startfähig.
 */
function hilfsskript(pwa) {
  return `(function(){
try{if(navigator.audioSession)navigator.audioSession.type='ambient'}catch(e){}
var O=window.Audio,offen=[];
if(O){var P=O.prototype.play,A=function(s){var a=new O(s);a.play=function(){a.__spiel=1;a.muted=false;return P.call(a)};offen.push(a);return a};A.prototype=O.prototype;window.Audio=A}
function freigeben(){var l=offen;offen=[];l.forEach(function(a){if(!a.paused)return;try{a.__spiel=0;a.muted=true;var p=P.call(a);if(p&&p.then)p.then(function(){if(!a.__spiel){a.pause();a.currentTime=0}a.muted=false},function(){a.muted=false;if(!a.__spiel)offen.push(a)});else{a.pause();a.muted=false}}catch(e){a.muted=false}})}
['touchend','click','keydown'].forEach(function(t){document.addEventListener(t,freigeben,true)});
${pwa ? `if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol))window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}` : ''}
})();`;
}

function seite(js, pwa) {
  const kopf = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
    `<meta name="theme-color" content="${HINTERGRUND}">`,
    '<meta name="color-scheme" content="dark light">',
    '<meta name="description" content="Das tägliche Farbrätsel. Offline, werbefrei, ohne Konto.">',
    '<title>Irisa</title>',
  ];
  if (pwa) {
    kopf.push(
      '<meta name="apple-mobile-web-app-capable" content="yes">',
      '<meta name="mobile-web-app-capable" content="yes">',
      '<meta name="apple-mobile-web-app-title" content="Irisa">',
      '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
      '<meta name="format-detection" content="telephone=no">',
      '<link rel="manifest" href="manifest.webmanifest">',
      '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
      '<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">',
    );
  }
  const stil =
    `html,body{height:100%;margin:0;background:${HINTERGRUND}}` +
    'body{overflow:hidden;overscroll-behavior:none;-webkit-user-select:none;user-select:none;' +
    '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%;touch-action:manipulation}' +
    '#root{display:flex;height:100%;flex:1}';
  return (
    `<!doctype html><html lang="de"><head>${kopf.join('')}<style>${stil}</style></head>` +
    `<body><div id="root"></div><noscript>Irisa braucht JavaScript.</noscript>` +
    `<script>${hilfsskript(pwa)}</script><script>${js}</script></body></html>`
  );
}

async function symbole() {
  const Jimp = require('jimp-compact');
  const quelle = await Jimp.read(path.join(WURZEL, 'assets', 'icon.png'));
  for (const [name, groesse] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    await quelle.clone().resize(groesse, groesse, Jimp.RESIZE_BICUBIC).writeAsync(path.join(ZIEL, name));
  }
}

function manifest() {
  return JSON.stringify(
    {
      name: 'Irisa',
      short_name: 'Irisa',
      description: 'Das tägliche Farbrätsel. Offline, werbefrei, ohne Konto.',
      lang: 'de',
      start_url: './',
      scope: './',
      id: './',
      display: 'standalone',
      orientation: 'portrait',
      background_color: HINTERGRUND,
      theme_color: HINTERGRUND,
      categories: ['games', 'puzzle'],
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    },
    null,
    2,
  );
}

/**
 * Service Worker: Die App kommt sofort aus dem Cache (auch im Flugmodus);
 * im Hintergrund wird nach einer neuen Fassung gesehen, die beim nächsten
 * Start gilt. Die Versionskennung wechselt mit jedem Build, damit alte
 * Caches aufgeräumt werden.
 */
function serviceWorker(version) {
  return `const CACHE = 'irisa-${version}';
const DATEIEN = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n.startsWith('irisa-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET' || new URL(anfrage.url).origin !== location.origin) return;
  const seite = anfrage.mode === 'navigate';
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const treffer = await c.match(seite ? 'index.html' : anfrage, { ignoreSearch: true });
      const frisch = fetch(anfrage)
        .then((antwort) => {
          if (antwort.ok) c.put(seite ? 'index.html' : anfrage, antwort.clone());
          return antwort;
        })
        .catch(() => treffer);
      if (treffer) {
        e.waitUntil(frisch.catch(() => {}));
        return treffer;
      }
      return frisch;
    }),
  );
});
`;
}

async function main() {
  const eigenerExport = !process.argv[2];
  const ordner = process.argv[2] || exportiere();
  const { js, ersetzt } = bettEin(ordner);
  if (eigenerExport) fs.rmSync(ordner, { recursive: true, force: true });

  fs.rmSync(ZIEL, { recursive: true, force: true });
  fs.mkdirSync(ZIEL, { recursive: true });
  const html = seite(js, true);
  fs.writeFileSync(path.join(ZIEL, 'index.html'), html);
  fs.writeFileSync(path.join(ZIEL, 'manifest.webmanifest'), manifest());
  await symbole();
  const version = crypto.createHash('sha256').update(html).digest('hex').slice(0, 12);
  fs.writeFileSync(path.join(ZIEL, 'sw.js'), serviceWorker(version));
  // Ohne diese Datei schickt GitHub Pages alles durch Jekyll — unnötig langsam.
  fs.writeFileSync(path.join(WURZEL, 'docs', '.nojekyll'), '');

  fs.mkdirSync(path.dirname(DOWNLOAD), { recursive: true });
  fs.writeFileSync(DOWNLOAD, seite(js, false));

  const mb = (n) => (n / 1024 / 1024).toFixed(1);
  console.log(`${ersetzt} Dateien eingebettet · docs/spielen/index.html ${mb(html.length)} MB · Version ${version}`);
}

main().catch((fehler) => {
  console.error(fehler);
  process.exit(1);
});
