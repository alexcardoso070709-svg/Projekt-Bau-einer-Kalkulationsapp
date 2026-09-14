const STORAGE_KEY_ITEMS = 'kleiderschrank.items';
const STORAGE_KEY_OUTFITS = 'kleiderschrank.outfits';

const CATEGORY_ICONS = {
  Oberteil: '👕',
  Hose: '👖',
  Kleid: '👗',
  Jacke: '🧥',
  Schuhe: '👟',
  Accessoire: '👜',
};

const COMBI_CATEGORIES = ['Oberteil', 'Hose', 'Kleid', 'Jacke', 'Schuhe', 'Accessoire'];

let items = loadItems();
let outfits = loadOutfits();
let selectedOutfitPieces = {}; // category -> itemId

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_ITEMS)) || [];
  } catch (e) {
    return [];
  }
}

function loadOutfits() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_OUTFITS)) || [];
  } catch (e) {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
}

function saveOutfits() {
  localStorage.setItem(STORAGE_KEY_OUTFITS, JSON.stringify(outfits));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'outfits') renderOutfits();
    if (btn.dataset.tab === 'kombinieren') renderCombi();
  });
});

// ---------- Item Grid ----------
function renderItemGrid() {
  const grid = document.getElementById('itemGrid');
  const empty = document.getElementById('emptyState');
  const catFilter = document.getElementById('filterCategory').value;
  const colorFilter = document.getElementById('filterColor').value;
  const search = document.getElementById('searchInput').value.trim().toLowerCase();

  let filtered = items.filter(it => {
    if (catFilter && it.category !== catFilter) return false;
    if (colorFilter && it.color !== colorFilter) return false;
    if (search && !it.name.toLowerCase().includes(search)) return false;
    return true;
  });

  grid.innerHTML = '';
  empty.hidden = items.length !== 0;

  filtered.forEach(it => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-thumb">${it.image ? `<img src="${it.image}" alt="${escapeHtml(it.name)}">` : CATEGORY_ICONS[it.category] || '👕'}</div>
      <div class="item-info">
        <p class="name">${escapeHtml(it.name)}</p>
        <p class="meta">${it.category} · ${it.color}</p>
      </div>
    `;
    card.addEventListener('click', () => openItemModal(it));
    grid.appendChild(card);
  });

  updateColorFilterOptions();
}

function updateColorFilterOptions() {
  const select = document.getElementById('filterColor');
  const current = select.value;
  const colors = [...new Set(items.map(i => i.color))].sort();
  select.innerHTML = '<option value="">Alle Farben</option>' +
    colors.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  select.value = colors.includes(current) ? current : '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

['filterCategory', 'filterColor'].forEach(id =>
  document.getElementById(id).addEventListener('change', renderItemGrid)
);
document.getElementById('searchInput').addEventListener('input', renderItemGrid);

// ---------- Modal ----------
const modal = document.getElementById('itemModal');
const itemForm = document.getElementById('itemForm');
let currentImageData = null;

document.getElementById('addItemBtn').addEventListener('click', () => openItemModal(null));
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

function openItemModal(item) {
  itemForm.reset();
  document.getElementById('itemImagePreview').hidden = true;
  currentImageData = null;
  if (item) {
    document.getElementById('modalTitle').textContent = 'Kleidungsstück bearbeiten';
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemColor').value = item.color;
    document.getElementById('itemSeason').value = item.season || 'Ganzjährig';
    document.getElementById('itemNote').value = item.note || '';
    document.getElementById('deleteItemBtn').hidden = false;
    if (item.image) {
      currentImageData = item.image;
      const preview = document.getElementById('itemImagePreview');
      preview.src = item.image;
      preview.hidden = false;
    }
  } else {
    document.getElementById('modalTitle').textContent = 'Neues Kleidungsstück';
    document.getElementById('itemId').value = '';
    document.getElementById('deleteItemBtn').hidden = true;
  }
  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
}

document.getElementById('itemImage').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    currentImageData = reader.result;
    const preview = document.getElementById('itemImagePreview');
    preview.src = currentImageData;
    preview.hidden = false;
  };
  reader.readAsDataURL(file);
});

itemForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('itemId').value || uid();
  const data = {
    id,
    name: document.getElementById('itemName').value.trim(),
    category: document.getElementById('itemCategory').value,
    color: document.getElementById('itemColor').value.trim(),
    season: document.getElementById('itemSeason').value,
    note: document.getElementById('itemNote').value.trim(),
    image: currentImageData,
  };
  const existingIndex = items.findIndex(i => i.id === id);
  if (existingIndex >= 0) {
    items[existingIndex] = data;
  } else {
    items.push(data);
  }
  saveItems();
  renderItemGrid();
  closeModal();
});

document.getElementById('deleteItemBtn').addEventListener('click', () => {
  const id = document.getElementById('itemId').value;
  if (!id) return;
  if (!confirm('Dieses Kleidungsstück wirklich löschen?')) return;
  items = items.filter(i => i.id !== id);
  outfits = outfits.map(o => ({ ...o, pieceIds: o.pieceIds.filter(pid => pid !== id) }))
                   .filter(o => o.pieceIds.length > 0);
  saveItems();
  saveOutfits();
  renderItemGrid();
  closeModal();
});

// ---------- Kombinieren ----------
function renderCombi() {
  COMBI_CATEGORIES.forEach(cat => {
    const list = document.querySelector(`.picker-list[data-cat-list="${cat}"]`);
    const catItems = items.filter(i => i.category === cat);
    list.innerHTML = '';
    if (catItems.length === 0) {
      list.innerHTML = '<p class="picker-empty">Keine Teile</p>';
      return;
    }
    catItems.forEach(it => {
      const row = document.createElement('div');
      row.className = 'picker-item' + (selectedOutfitPieces[cat] === it.id ? ' selected' : '');
      row.innerHTML = `
        <span class="thumb">${it.image ? `<img src="${it.image}">` : CATEGORY_ICONS[cat]}</span>
        <span>${escapeHtml(it.name)}</span>
      `;
      row.addEventListener('click', () => {
        if (selectedOutfitPieces[cat] === it.id) {
          delete selectedOutfitPieces[cat];
        } else {
          selectedOutfitPieces[cat] = it.id;
        }
        renderCombi();
      });
      list.appendChild(row);
    });
  });
  renderOutfitPreview();
}

function renderOutfitPreview() {
  const preview = document.getElementById('outfitPreview');
  const ids = Object.values(selectedOutfitPieces);
  if (ids.length === 0) {
    preview.innerHTML = '<p class="preview-empty">Wähle Teile aus, um ein Outfit zu bauen.</p>';
    return;
  }
  preview.innerHTML = ids.map(id => {
    const it = items.find(i => i.id === id);
    if (!it) return '';
    return `
      <div class="preview-row">
        <span class="thumb">${it.image ? `<img src="${it.image}">` : CATEGORY_ICONS[it.category]}</span>
        <span>${escapeHtml(it.name)} <em style="color:var(--text-muted)">(${it.category})</em></span>
      </div>
    `;
  }).join('');
}

document.getElementById('randomOutfitBtn').addEventListener('click', () => {
  selectedOutfitPieces = {};
  COMBI_CATEGORIES.forEach(cat => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length === 0) return;
    // Roughly: prefer either dress OR top+bottom combo, keep it simple/random
    if (Math.random() < 0.6 || cat === 'Kleid') {
      selectedOutfitPieces[cat] = catItems[Math.floor(Math.random() * catItems.length)].id;
    }
  });
  if (Object.keys(selectedOutfitPieces).length === 0) {
    alert('Füge zuerst ein paar Kleidungsstücke hinzu!');
  }
  renderCombi();
});

document.getElementById('saveOutfitBtn').addEventListener('click', () => {
  const ids = Object.values(selectedOutfitPieces);
  if (ids.length === 0) {
    alert('Wähle mindestens ein Kleidungsstück aus.');
    return;
  }
  const nameInput = document.getElementById('outfitNameInput');
  const name = nameInput.value.trim() || `Outfit ${outfits.length + 1}`;
  outfits.push({ id: uid(), name, pieceIds: ids, createdAt: Date.now() });
  saveOutfits();
  selectedOutfitPieces = {};
  nameInput.value = '';
  renderCombi();
  alert('Outfit gespeichert!');
});

// ---------- Outfits Tab ----------
function renderOutfits() {
  const grid = document.getElementById('outfitGrid');
  const empty = document.getElementById('emptyOutfits');
  empty.hidden = outfits.length !== 0;
  grid.innerHTML = '';
  outfits.slice().reverse().forEach(outfit => {
    const pieces = outfit.pieceIds.map(id => items.find(i => i.id === id)).filter(Boolean);
    const card = document.createElement('div');
    card.className = 'outfit-card';
    card.innerHTML = `
      <h3>${escapeHtml(outfit.name)}</h3>
      <div class="pieces">
        ${pieces.map(it => `<span class="piece-thumb" title="${escapeHtml(it.name)}">${it.image ? `<img src="${it.image}">` : CATEGORY_ICONS[it.category]}</span>`).join('')}
      </div>
      <div class="outfit-card-actions">
        <button data-action="load">Bearbeiten</button>
        <button data-action="delete">Löschen</button>
      </div>
    `;
    card.querySelector('[data-action="load"]').addEventListener('click', () => {
      selectedOutfitPieces = {};
      pieces.forEach(it => { selectedOutfitPieces[it.category] = it.id; });
      document.querySelector('.tab-btn[data-tab="kombinieren"]').click();
    });
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (!confirm('Outfit wirklich löschen?')) return;
      outfits = outfits.filter(o => o.id !== outfit.id);
      saveOutfits();
      renderOutfits();
    });
    grid.appendChild(card);
  });
}

// ---------- Init ----------
renderItemGrid();
renderCombi();
renderOutfits();
