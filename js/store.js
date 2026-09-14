// Persistenz auf IndexedDB. localStorage scheidet aus: Fotos als Data-URL
// sprengen dort schon nach gut einem Dutzend Teilen das 5-MB-Limit.
const Store = (function () {
  const DB_NAME = 'kleiderschrank';
  const DB_VERSION = 1;
  const LEGACY_ITEMS_KEY = 'kleiderschrank.items';
  const LEGACY_OUTFITS_KEY = 'kleiderschrank.outfits';

  let dbPromise = null;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('outfits')) db.createObjectStore('outfits', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  function run(storeName, mode, fn) {
    return openDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = fn(tx.objectStore(storeName));
      tx.oncomplete = () => resolve(request && 'result' in request ? request.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }));
  }

  const getAll = (name) => run(name, 'readonly', s => s.getAll());
  const put = (name, value) => run(name, 'readwrite', s => s.put(value));
  const remove = (name, id) => run(name, 'readwrite', s => s.delete(id));
  const putMany = (name, values) => run(name, 'readwrite', s => { values.forEach(v => s.put(v)); });
  const getMeta = (key) => run('meta', 'readonly', s => s.get(key));
  const setMeta = (key, value) => run('meta', 'readwrite', s => s.put(value, key));

  // Bestand aus der localStorage-Version übernehmen. Die Altdaten bleiben
  // liegen, damit ein fehlgeschlagener Umzug nichts vernichtet.
  async function migrateLegacy() {
    if (await getMeta('legacyMigrated')) return 0;

    let legacyItems = [];
    let legacyOutfits = [];
    try {
      legacyItems = JSON.parse(localStorage.getItem(LEGACY_ITEMS_KEY)) || [];
      legacyOutfits = JSON.parse(localStorage.getItem(LEGACY_OUTFITS_KEY)) || [];
    } catch (e) {
      legacyItems = [];
      legacyOutfits = [];
    }

    if (legacyItems.length) await putMany('items', legacyItems.map(normalizeItem));
    if (legacyOutfits.length) await putMany('outfits', legacyOutfits.map(normalizeOutfit));
    await setMeta('legacyMigrated', true);
    return legacyItems.length + legacyOutfits.length;
  }

  function normalizeItem(raw) {
    return {
      id: raw.id,
      name: raw.name || '',
      category: raw.category || 'Oberteil',
      color: raw.color || '',
      season: raw.season || 'Ganzjährig',
      brand: raw.brand || '',
      note: raw.note || '',
      image: raw.image || null,
      favorite: Boolean(raw.favorite),
      wearCount: Number(raw.wearCount) || 0,
      lastWorn: raw.lastWorn || null,
      createdAt: raw.createdAt || Date.now(),
    };
  }

  function normalizeOutfit(raw) {
    return {
      id: raw.id,
      name: raw.name || '',
      pieceIds: Array.isArray(raw.pieceIds) ? raw.pieceIds : [],
      favorite: Boolean(raw.favorite),
      wearCount: Number(raw.wearCount) || 0,
      lastWorn: raw.lastWorn || null,
      createdAt: raw.createdAt || Date.now(),
    };
  }

  async function exportAll() {
    const [items, outfits] = await Promise.all([getAll('items'), getAll('outfits')]);
    return { app: 'kleiderschrank', version: 1, exportedAt: new Date().toISOString(), items, outfits };
  }

  async function importAll(data) {
    if (!data || data.app !== 'kleiderschrank' || !Array.isArray(data.items)) {
      throw new Error('Unbekanntes Dateiformat');
    }
    const items = data.items.filter(i => i && i.id).map(normalizeItem);
    const outfits = (Array.isArray(data.outfits) ? data.outfits : []).filter(o => o && o.id).map(normalizeOutfit);
    if (items.length) await putMany('items', items);
    if (outfits.length) await putMany('outfits', outfits);
    return { items: items.length, outfits: outfits.length };
  }

  async function usage() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    try {
      const { usage: used, quota } = await navigator.storage.estimate();
      return { used, quota };
    } catch (e) {
      return null;
    }
  }

  return {
    getItems: () => getAll('items'),
    getOutfits: () => getAll('outfits'),
    putItem: (item) => put('items', item),
    putOutfit: (outfit) => put('outfits', outfit),
    deleteItem: (id) => remove('items', id),
    deleteOutfit: (id) => remove('outfits', id),
    putItems: (items) => putMany('items', items),
    migrateLegacy,
    normalizeItem,
    normalizeOutfit,
    exportAll,
    importAll,
    usage,
  };
})();
