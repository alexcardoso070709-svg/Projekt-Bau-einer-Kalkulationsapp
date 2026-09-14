const CATEGORIES = ['Oberteil', 'Hose', 'Kleid', 'Jacke', 'Schuhe', 'Accessoire'];
const CATEGORY_LABELS = {
  Oberteil: 'Oberteil',
  Hose: 'Hose / Rock',
  Kleid: 'Kleid',
  Jacke: 'Jacke',
  Schuhe: 'Schuhe',
  Accessoire: 'Accessoire',
};
const CATEGORY_ICONS = {
  Oberteil: '👕', Hose: '👖', Kleid: '👗', Jacke: '🧥', Schuhe: '👟', Accessoire: '👜',
};
const SEASONS = ['Ganzjährig', 'Sommer', 'Übergang', 'Winter'];
const COLOR_SUGGESTIONS = [
  'Schwarz', 'Weiß', 'Grau', 'Beige', 'Braun', 'Blau', 'Dunkelblau',
  'Rot', 'Grün', 'Gelb', 'Rosa', 'Lila', 'Orange',
];
// Neutrale Töne lassen sich mit allem tragen und zählen deshalb nicht als
// zweite Signalfarbe, wenn die App vor Farbkollisionen warnt.
// Jeansblau zählt bewusst dazu: sonst blendet die App zu jeder kräftigen
// Farbe die Jeans ab, um die die meisten Garderoben herum gebaut sind.
const NEUTRALS = ['schwarz', 'weiss', 'grau', 'beige', 'braun', 'creme', 'ecru',
  'blau', 'navy', 'dunkelblau', 'jeansblau', 'denim', 'khaki', 'oliv'];

const state = {
  items: [],
  outfits: [],
  selection: {},
  editingOutfitId: null,
  combiSeason: '',
  pendingImage: null,
};

// ---------- Helfer ----------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const $ = (sel) => document.querySelector(sel);

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function normalizeColor(color) {
  return String(color || '').trim().toLowerCase().replace(/ß/g, 'ss');
}

const isNeutral = (color) => NEUTRALS.includes(normalizeColor(color));

function formatDate(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('visible'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => { el.hidden = true; }, 250);
  }, 2600);
}

const itemById = (id) => state.items.find(i => i.id === id);

function thumbHtml(item, extraClass) {
  const inner = item.image
    ? `<img src="${item.image}" alt="" loading="lazy">`
    : (CATEGORY_ICONS[item.category] || '👕');
  return `<span class="${extraClass}">${inner}</span>`;
}

// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    $('#' + btn.dataset.tab).classList.add('active');
    $('#headerTitle').textContent = btn.dataset.title;
    window.scrollTo(0, 0);
    if (btn.dataset.tab === 'outfits') renderOutfits();
    if (btn.dataset.tab === 'kombinieren') renderCombi();
    if (btn.dataset.tab === 'uebersicht') renderStats();
  });
});

// ---------- Auswahllisten füllen ----------
function fillSelects() {
  const catOptions = CATEGORIES.map(c => `<option value="${c}">${CATEGORY_LABELS[c]}</option>`).join('');
  $('#itemCategory').innerHTML = catOptions;
  $('#filterCategory').innerHTML = '<option value="">Alle Kategorien</option>' + catOptions;

  const seasonOptions = SEASONS.map(s => `<option value="${s}">${s}</option>`).join('');
  $('#itemSeason').innerHTML = seasonOptions;
  $('#filterSeason').innerHTML = '<option value="">Alle Saisons</option>' + seasonOptions;

  $('#colorSuggestions').innerHTML = COLOR_SUGGESTIONS.map(c => `<option value="${c}"></option>`).join('');
}

// ---------- Schrank ----------
function visibleItems() {
  const cat = $('#filterCategory').value;
  const color = $('#filterColor').value;
  const season = $('#filterSeason').value;
  const search = $('#searchInput').value.trim().toLowerCase();
  const sort = $('#sortBy').value;

  const result = state.items.filter(it => {
    if (cat && it.category !== cat) return false;
    if (color && normalizeColor(it.color) !== color) return false;
    if (season && it.season !== season) return false;
    if (search) {
      const haystack = `${it.name} ${it.color} ${it.brand} ${it.note}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  const byName = (a, b) => a.name.localeCompare(b.name, 'de');
  if (sort === 'name') result.sort(byName);
  else if (sort === 'worn') result.sort((a, b) => b.wearCount - a.wearCount || byName(a, b));
  else if (sort === 'unworn') result.sort((a, b) => a.wearCount - b.wearCount || byName(a, b));
  else result.sort((a, b) => b.createdAt - a.createdAt);

  return result;
}

function renderItemGrid() {
  const grid = $('#itemGrid');
  const filtered = visibleItems();

  $('#emptyState').hidden = state.items.length > 0;
  $('#noMatches').hidden = !(state.items.length > 0 && filtered.length === 0);
  $('#resultCount').textContent = state.items.length
    ? `${filtered.length} von ${state.items.length} Teilen`
    : '';

  grid.innerHTML = '';
  filtered.forEach(it => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'item-card';
    card.innerHTML = `
      ${thumbHtml(it, 'item-thumb')}
      ${it.favorite ? '<span class="fav-badge" aria-label="Lieblingsstück">★</span>' : ''}
      <span class="item-info">
        <span class="name">${escapeHtml(it.name)}</span>
        <span class="meta">${escapeHtml(it.color)} · ${escapeHtml(CATEGORY_LABELS[it.category] || it.category)}</span>
        <span class="meta worn">${it.wearCount ? `${it.wearCount}× getragen` : 'nie getragen'}</span>
      </span>
    `;
    card.addEventListener('click', () => openItemModal(it));
    grid.appendChild(card);
  });

  refreshColorFilter();
}

function refreshColorFilter() {
  const select = $('#filterColor');
  const current = select.value;
  const seen = new Map();
  state.items.forEach(it => {
    const key = normalizeColor(it.color);
    if (key && !seen.has(key)) seen.set(key, it.color.trim());
  });
  const entries = [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'de'));
  select.innerHTML = '<option value="">Alle Farben</option>' +
    entries.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join('');
  select.value = seen.has(current) ? current : '';
}

['filterCategory', 'filterColor', 'filterSeason', 'sortBy'].forEach(id =>
  $('#' + id).addEventListener('change', renderItemGrid)
);
$('#searchInput').addEventListener('input', renderItemGrid);

// ---------- Modal: Kleidungsstück ----------
const itemModal = $('#itemModal');

$('#addItemBtn').addEventListener('click', () => openItemModal(null));
$('#closeModalBtn').addEventListener('click', () => { itemModal.hidden = true; });
itemModal.addEventListener('click', (e) => { if (e.target === itemModal) itemModal.hidden = true; });

function setImagePreview(dataUrl) {
  state.pendingImage = dataUrl;
  const preview = $('#itemImagePreview');
  preview.hidden = !dataUrl;
  $('#imagePlaceholder').hidden = Boolean(dataUrl);
  $('#removeImageBtn').hidden = !dataUrl;
  if (dataUrl) preview.src = dataUrl;
}

function openItemModal(item) {
  $('#itemForm').reset();
  $('#imageStatus').hidden = true;
  setImagePreview(item ? item.image : null);

  if (item) {
    $('#modalTitle').textContent = 'Teil bearbeiten';
    $('#itemId').value = item.id;
    $('#itemName').value = item.name;
    $('#itemCategory').value = item.category;
    $('#itemColor').value = item.color;
    $('#itemSeason').value = item.season;
    $('#itemBrand').value = item.brand || '';
    $('#itemNote').value = item.note || '';
    $('#itemFavorite').checked = Boolean(item.favorite);
    $('#deleteItemBtn').hidden = false;
    $('#wearBox').hidden = false;
    const last = formatDate(item.lastWorn);
    $('#wearInfo').textContent = item.wearCount
      ? `${item.wearCount}× getragen${last ? `, zuletzt am ${last}` : ''}`
      : 'Noch nie getragen';
  } else {
    $('#modalTitle').textContent = 'Neues Teil';
    $('#itemId').value = '';
    $('#itemSeason').value = 'Ganzjährig';
    $('#deleteItemBtn').hidden = true;
    $('#wearBox').hidden = true;
  }
  itemModal.hidden = false;
  $('#itemName').focus();
}

$('#itemImage').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const status = $('#imageStatus');
  status.hidden = false;
  status.textContent = 'Foto wird verkleinert…';
  try {
    const dataUrl = await Images.compress(file);
    setImagePreview(dataUrl);
    status.textContent = `Foto bereit (${Math.round(dataUrl.length / 1024)} KB)`;
  } catch (err) {
    status.textContent = 'Foto konnte nicht verarbeitet werden.';
  }
  e.target.value = '';
});

$('#removeImageBtn').addEventListener('click', () => {
  setImagePreview(null);
  $('#imageStatus').hidden = true;
});

$('#itemForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#itemId').value;
  const existing = id ? itemById(id) : null;
  const item = Store.normalizeItem({
    ...(existing || {}),
    id: id || uid(),
    name: $('#itemName').value.trim(),
    category: $('#itemCategory').value,
    color: $('#itemColor').value.trim(),
    season: $('#itemSeason').value,
    brand: $('#itemBrand').value.trim(),
    note: $('#itemNote').value.trim(),
    favorite: $('#itemFavorite').checked,
    image: state.pendingImage,
  });

  try {
    await Store.putItem(item);
  } catch (err) {
    toast('Speichern fehlgeschlagen – Speicher voll?');
    return;
  }

  if (existing) {
    state.items[state.items.indexOf(existing)] = item;
  } else {
    state.items.push(item);
  }
  itemModal.hidden = true;
  renderItemGrid();
  toast(existing ? 'Änderungen gespeichert' : `„${item.name}" hinzugefügt`);
});

$('#deleteItemBtn').addEventListener('click', async () => {
  const id = $('#itemId').value;
  const item = itemById(id);
  if (!item) return;
  if (!confirm(`„${item.name}" wirklich löschen?`)) return;

  await Store.deleteItem(id);
  state.items = state.items.filter(i => i.id !== id);

  // Outfits, die das Teil enthalten, verlieren es; leere Outfits fliegen raus.
  const affected = state.outfits.filter(o => o.pieceIds.includes(id));
  for (const outfit of affected) {
    outfit.pieceIds = outfit.pieceIds.filter(pid => pid !== id);
    if (outfit.pieceIds.length === 0) {
      await Store.deleteOutfit(outfit.id);
      state.outfits = state.outfits.filter(o => o.id !== outfit.id);
    } else {
      await Store.putOutfit(outfit);
    }
  }

  Object.keys(state.selection).forEach(cat => {
    if (state.selection[cat] === id) delete state.selection[cat];
  });

  itemModal.hidden = true;
  renderItemGrid();
  toast('Teil gelöscht');
});

$('#wearItemBtn').addEventListener('click', async () => {
  const item = itemById($('#itemId').value);
  if (!item) return;
  item.wearCount += 1;
  item.lastWorn = Date.now();
  await Store.putItem(item);
  $('#wearInfo').textContent = `${item.wearCount}× getragen, zuletzt am ${formatDate(item.lastWorn)}`;
  renderItemGrid();
  toast('Als getragen vermerkt');
});

// ---------- Kombinieren ----------
function matchesSeason(item) {
  if (!state.combiSeason) return true;
  return item.season === state.combiSeason || item.season === 'Ganzjährig';
}

// Signalfarben der bereits gewählten Teile, ohne die eigene Kategorie.
function statementColors(exceptCategory) {
  const colors = new Set();
  Object.entries(state.selection).forEach(([cat, id]) => {
    if (cat === exceptCategory) return;
    const it = itemById(id);
    if (it && !isNeutral(it.color)) colors.add(normalizeColor(it.color));
  });
  return colors;
}

function harmonizes(item) {
  if (isNeutral(item.color)) return true;
  const others = statementColors(item.category);
  if (others.size === 0) return true;
  return others.has(normalizeColor(item.color));
}

function renderCombi() {
  const container = $('#pickerStrips');
  $('#emptyCombi').hidden = state.items.length > 0;
  container.innerHTML = '';

  CATEGORIES.forEach(cat => {
    const catItems = state.items.filter(i => i.category === cat && matchesSeason(i));
    if (catItems.length === 0) return;

    const strip = document.createElement('div');
    strip.className = 'strip';
    strip.innerHTML = `<h3>${CATEGORY_LABELS[cat]}</h3>`;

    const row = document.createElement('div');
    row.className = 'strip-row';
    row.dataset.catList = cat;

    catItems.forEach(it => {
      const selected = state.selection[cat] === it.id;
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'strip-tile' + (selected ? ' selected' : '') + (harmonizes(it) ? '' : ' dimmed');
      tile.innerHTML = `
        ${thumbHtml(it, 'strip-thumb')}
        <span class="strip-name">${escapeHtml(it.name)}</span>
      `;
      tile.addEventListener('click', () => {
        if (state.selection[cat] === it.id) delete state.selection[cat];
        else state.selection[cat] = it.id;
        renderCombi();
      });
      row.appendChild(tile);
    });

    strip.appendChild(row);
    container.appendChild(strip);
  });

  renderOutfitPreview();
}

function renderOutfitPreview() {
  const preview = $('#outfitPreview');
  const chosen = CATEGORIES.map(cat => state.selection[cat]).filter(Boolean).map(itemById).filter(Boolean);

  $('#combiHeading').textContent = state.editingOutfitId ? 'Outfit bearbeiten' : 'Neues Outfit';
  $('#saveOutfitBtn').textContent = state.editingOutfitId ? 'Aktualisieren' : 'Speichern';
  $('#saveAsNewBtn').hidden = !state.editingOutfitId;

  if (chosen.length === 0) {
    preview.innerHTML = '<p class="preview-empty">Noch nichts gewählt – tippe unten auf die Teile.</p>';
  } else {
    preview.innerHTML = chosen.map(it => `
      <div class="preview-row">
        ${thumbHtml(it, 'preview-thumb')}
        <span class="preview-text">
          <strong>${escapeHtml(it.name)}</strong>
          <span class="meta">${escapeHtml(CATEGORY_LABELS[it.category])} · ${escapeHtml(it.color)}</span>
        </span>
      </div>
    `).join('');
  }

  const hint = $('#combiHint');
  const messages = [];
  const accents = new Set(chosen.filter(i => !isNeutral(i.color)).map(i => normalizeColor(i.color)));
  if (accents.size > 2) messages.push('Viele kräftige Farben auf einmal – vielleicht ein Teil neutral ersetzen.');
  if (state.selection.Kleid && (state.selection.Oberteil || state.selection.Hose)) {
    messages.push('Kleid zusammen mit Oberteil oder Hose gewählt.');
  }
  if (chosen.length > 0 && !state.selection.Schuhe) messages.push('Schuhe fehlen noch.');
  hint.hidden = messages.length === 0;
  hint.textContent = messages.join(' ');
}

document.querySelectorAll('.season-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.combiSeason = btn.dataset.season;
    renderCombi();
  });
});

$('#resetOutfitBtn').addEventListener('click', () => {
  state.selection = {};
  state.editingOutfitId = null;
  $('#outfitNameInput').value = '';
  renderCombi();
});

// Zufallsvorschlag nach den Regeln, die man auch beim Anziehen anwendet:
// entweder Kleid oder Oberteil plus Hose, Schuhe immer, Jacke je nach Saison.
function pickHarmonizing(pool, accents) {
  const fitting = pool.filter(it => isNeutral(it.color) || accents.size === 0 || accents.has(normalizeColor(it.color)));
  const source = fitting.length ? fitting : pool;
  return source[Math.floor(Math.random() * source.length)];
}

$('#randomOutfitBtn').addEventListener('click', () => {
  const pools = {};
  CATEGORIES.forEach(cat => {
    pools[cat] = state.items.filter(i => i.category === cat && matchesSeason(i));
  });

  if (CATEGORIES.every(cat => pools[cat].length === 0)) {
    toast('Lege erst ein paar Teile an.');
    return;
  }

  const selection = {};
  const accents = new Set();
  const take = (cat) => {
    if (!pools[cat].length) return;
    const pick = pickHarmonizing(pools[cat], accents);
    selection[cat] = pick.id;
    if (!isNeutral(pick.color)) accents.add(normalizeColor(pick.color));
  };

  const useDress = pools.Kleid.length > 0 && (pools.Oberteil.length === 0 || pools.Hose.length === 0 || Math.random() < 0.35);
  if (useDress) {
    take('Kleid');
  } else {
    take('Oberteil');
    take('Hose');
  }
  take('Schuhe');

  const wantsJacket = state.combiSeason === 'Winter' || state.combiSeason === 'Übergang' || Math.random() < 0.4;
  if (wantsJacket) take('Jacke');
  if (Math.random() < 0.4) take('Accessoire');

  state.selection = selection;
  state.editingOutfitId = null;
  $('#outfitNameInput').value = '';
  renderCombi();
});

async function persistOutfit(asNew) {
  const pieceIds = CATEGORIES.map(cat => state.selection[cat]).filter(Boolean);
  if (pieceIds.length === 0) {
    toast('Wähle mindestens ein Teil aus.');
    return;
  }
  const typed = $('#outfitNameInput').value.trim();
  const editing = !asNew && state.editingOutfitId
    ? state.outfits.find(o => o.id === state.editingOutfitId)
    : null;

  if (editing) {
    editing.name = typed || editing.name;
    editing.pieceIds = pieceIds;
    await Store.putOutfit(editing);
    toast('Outfit aktualisiert');
  } else {
    const outfit = Store.normalizeOutfit({
      id: uid(),
      name: typed || `Outfit ${state.outfits.length + 1}`,
      pieceIds,
      createdAt: Date.now(),
    });
    await Store.putOutfit(outfit);
    state.outfits.push(outfit);
    toast(`„${outfit.name}" gespeichert`);
  }

  state.selection = {};
  state.editingOutfitId = null;
  $('#outfitNameInput').value = '';
  renderCombi();
}

$('#saveOutfitBtn').addEventListener('click', () => persistOutfit(false));
$('#saveAsNewBtn').addEventListener('click', () => persistOutfit(true));

// ---------- Outfits ----------
function renderOutfits() {
  const grid = $('#outfitGrid');
  $('#emptyOutfits').hidden = state.outfits.length > 0;
  grid.innerHTML = '';

  const sorted = [...state.outfits].sort((a, b) => b.createdAt - a.createdAt);
  sorted.forEach(outfit => {
    const pieces = outfit.pieceIds.map(itemById).filter(Boolean);
    const last = formatDate(outfit.lastWorn);
    const card = document.createElement('article');
    card.className = 'outfit-card';
    card.innerHTML = `
      <div class="outfit-head">
        <h3>${escapeHtml(outfit.name)}</h3>
        <button class="icon-btn fav-toggle${outfit.favorite ? ' on' : ''}" data-action="fav"
                aria-label="Als Favorit markieren">${outfit.favorite ? '★' : '☆'}</button>
      </div>
      <div class="pieces">
        ${pieces.map(it => thumbHtml(it, 'piece-thumb')).join('')}
      </div>
      <p class="outfit-meta">${pieces.map(p => escapeHtml(p.name)).join(' · ')}</p>
      <p class="outfit-meta muted">${outfit.wearCount ? `${outfit.wearCount}× getragen${last ? `, zuletzt ${last}` : ''}` : 'noch nie getragen'}</p>
      <div class="outfit-card-actions">
        <button class="btn-secondary small" data-action="wear">Heute getragen</button>
        <button class="link-btn" data-action="edit">Bearbeiten</button>
        <button class="link-btn danger" data-action="delete">Löschen</button>
      </div>
    `;

    card.querySelector('[data-action="wear"]').addEventListener('click', async () => {
      const now = Date.now();
      outfit.wearCount += 1;
      outfit.lastWorn = now;
      await Store.putOutfit(outfit);
      pieces.forEach(p => { p.wearCount += 1; p.lastWorn = now; });
      if (pieces.length) await Store.putItems(pieces);
      renderOutfits();
      renderItemGrid();
      toast('Als heute getragen vermerkt');
    });

    card.querySelector('[data-action="fav"]').addEventListener('click', async () => {
      outfit.favorite = !outfit.favorite;
      await Store.putOutfit(outfit);
      renderOutfits();
    });

    card.querySelector('[data-action="edit"]').addEventListener('click', () => {
      state.selection = {};
      pieces.forEach(p => { state.selection[p.category] = p.id; });
      state.editingOutfitId = outfit.id;
      $('#outfitNameInput').value = outfit.name;
      document.querySelector('.tab-btn[data-tab="kombinieren"]').click();
    });

    card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm(`Outfit „${outfit.name}" löschen?`)) return;
      await Store.deleteOutfit(outfit.id);
      state.outfits = state.outfits.filter(o => o.id !== outfit.id);
      if (state.editingOutfitId === outfit.id) state.editingOutfitId = null;
      renderOutfits();
      toast('Outfit gelöscht');
    });

    grid.appendChild(card);
  });
}

// ---------- Übersicht ----------
function countBy(list, keyFn) {
  const map = new Map();
  list.forEach(item => {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function barList(entries, total) {
  if (entries.length === 0) return '<p class="muted">Noch keine Daten.</p>';
  return `<ul class="bar-list">` + entries.map(([label, count]) => `
    <li>
      <span class="bar-label">${escapeHtml(label)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${Math.round((count / total) * 100)}%"></span></span>
      <span class="bar-count">${count}</span>
    </li>
  `).join('') + '</ul>';
}

async function renderStats() {
  const el = $('#statsContent');
  const items = state.items;

  if (items.length === 0) {
    el.innerHTML = `<div class="empty-state"><p class="empty-emoji">📊</p><p>Noch nichts zu zeigen.</p>
      <p class="empty-hint">Sobald du Teile erfasst, siehst du hier, was du besitzt.</p></div>`;
    return;
  }

  const neverWorn = items.filter(i => i.wearCount === 0).sort((a, b) => a.createdAt - b.createdAt);
  const mostWorn = [...items].filter(i => i.wearCount > 0).sort((a, b) => b.wearCount - a.wearCount).slice(0, 5);
  const favorites = items.filter(i => i.favorite);

  el.innerHTML = `
    <div class="stat-row">
      <div class="stat-tile"><span class="stat-value">${items.length}</span><span class="stat-label">Teile</span></div>
      <div class="stat-tile"><span class="stat-value">${state.outfits.length}</span><span class="stat-label">Outfits</span></div>
      <div class="stat-tile"><span class="stat-value">${neverWorn.length}</span><span class="stat-label">nie getragen</span></div>
      <div class="stat-tile"><span class="stat-value">${favorites.length}</span><span class="stat-label">Favoriten</span></div>
    </div>

    <section class="stat-block">
      <h3>Nach Kategorie</h3>
      ${barList(countBy(items, i => CATEGORY_LABELS[i.category] || i.category), items.length)}
    </section>

    <section class="stat-block">
      <h3>Nach Farbe</h3>
      ${barList(countBy(items, i => i.color.trim() || 'ohne Angabe'), items.length)}
    </section>

    <section class="stat-block">
      <h3>Nach Saison</h3>
      ${barList(countBy(items, i => i.season), items.length)}
    </section>

    <section class="stat-block">
      <h3>Am häufigsten getragen</h3>
      ${mostWorn.length ? `<ul class="mini-list">${mostWorn.map(i => `
        <li>${thumbHtml(i, 'mini-thumb')}<span>${escapeHtml(i.name)}</span><span class="muted">${i.wearCount}×</span></li>
      `).join('')}</ul>` : '<p class="muted">Noch nichts als getragen vermerkt.</p>'}
    </section>

    <section class="stat-block">
      <h3>Nie getragen <span class="muted">(${neverWorn.length})</span></h3>
      ${neverWorn.length ? `<ul class="mini-list">${neverWorn.slice(0, 20).map(i => `
        <li>${thumbHtml(i, 'mini-thumb')}<span>${escapeHtml(i.name)}</span><span class="muted">${escapeHtml(CATEGORY_LABELS[i.category])}</span></li>
      `).join('')}</ul>` : '<p class="muted">Alles war schon mal an. Stark.</p>'}
    </section>
  `;
}

// ---------- Backup ----------
const settingsModal = $('#settingsModal');

$('#settingsBtn').addEventListener('click', async () => {
  settingsModal.hidden = false;
  const info = await Store.usage();
  $('#storageInfo').textContent = info && info.used
    ? `Belegt: ${(info.used / 1024 / 1024).toFixed(1)} MB${info.quota ? ` von ca. ${(info.quota / 1024 / 1024).toFixed(0)} MB` : ''}`
    : '';
});
$('#closeSettingsBtn').addEventListener('click', () => { settingsModal.hidden = true; });
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.hidden = true; });

$('#exportBtn').addEventListener('click', async () => {
  const data = await Store.exportAll();
  const json = JSON.stringify(data);
  const filename = `kleiderschrank-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], filename, { type: 'application/json' });

  // Auf dem iPhone führt ein Download-Link im Standalone-Modus ins Leere,
  // über das Share-Sheet landet die Sicherung dagegen in Dateien oder iCloud.
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Kleiderschrank-Sicherung' });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Sicherung erstellt');
});

$('#importInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const counts = await Store.importAll(data);
    await loadData();
    // Die offene Zusammenstellung verweist womöglich auf Teile, die es nach
    // dem Einlesen nicht mehr gibt.
    state.selection = {};
    state.editingOutfitId = null;
    $('#outfitNameInput').value = '';
    renderItemGrid();
    renderOutfits();
    renderCombi();
    settingsModal.hidden = true;
    toast(`${counts.items} Teile und ${counts.outfits} Outfits eingelesen`);
  } catch (err) {
    toast('Datei konnte nicht gelesen werden');
  }
});

// ---------- Start ----------
async function loadData() {
  const [items, outfits] = await Promise.all([Store.getItems(), Store.getOutfits()]);
  state.items = items.map(Store.normalizeItem);
  state.outfits = outfits.map(Store.normalizeOutfit);
}

async function init() {
  fillSelects();
  // Ohne diese Zusage räumt iOS den Speicher einer selten geöffneten Seite
  // irgendwann ab – mitsamt Schrank.
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
  try {
    const migrated = await Store.migrateLegacy();
    await loadData();
    if (migrated) toast(`${migrated} Einträge übernommen`);
  } catch (err) {
    toast('Speicher nicht verfügbar – im privaten Modus?');
    return;
  }
  renderItemGrid();
  renderOutfits();
  renderCombi();
}

init();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
