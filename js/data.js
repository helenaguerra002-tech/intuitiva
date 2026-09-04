/* ================= store ================= */
const APP_VERSION = 'better-v3';
const LS = {
  schema:'better_schema', entries:'better_entries', sessions:'better_sessions', urges:'better_urges',
  inspo:'better_inspo', weight:'better_weight', progress:'better_progress', settings:'better_settings',
  runs:'better_runs', winsSeen:'better_winsSeen', backup:'better_lastBackup'
};
const load = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; } catch { return def; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const DEFAULT_SETTINGS = {
  targets: { runs: 3, strength: 2 },
  showMacros: false,
  heroId: null,
  startDate: '2026-09-04',
  endDate: '2026-12-31',
  runsApi: 'https://running-app-4o9g.onrender.com',
};

let entries  = load(LS.entries, []);
let sessions = load(LS.sessions, []);
let urges    = load(LS.urges, []);
let inspo    = load(LS.inspo, []);
let weights  = load(LS.weight, []);
let progress = load(LS.progress, []);
let winsSeen = load(LS.winsSeen, {});
let settings = { ...DEFAULT_SETTINGS, ...load(LS.settings, {}) };
settings.targets = { ...DEFAULT_SETTINGS.targets, ...(settings.targets || {}) };
let runsCache = load(LS.runs, { fetchedAt: 0, lastSyncAt: 0, needsMfa: false, activities: [] });

const commit = {
  entries:  () => save(LS.entries, entries),
  sessions: () => save(LS.sessions, sessions),
  urges:    () => save(LS.urges, urges),
  inspo:    () => save(LS.inspo, inspo),
  weights:  () => save(LS.weight, weights),
  progress: () => save(LS.progress, progress),
  winsSeen: () => save(LS.winsSeen, winsSeen),
  settings: () => save(LS.settings, settings),
  runs:     () => save(LS.runs, runsCache),
};

/* the previous app (Intuitiva) is gone — Helena chose a fresh start */
function cleanupLegacy(){
  const gone = Object.keys(localStorage).filter(k => k.startsWith('intuitiva_'));
  gone.forEach(k => localStorage.removeItem(k));
  try { indexedDB.deleteDatabase('intuitiva-photos'); } catch {}
  if (!localStorage.getItem(LS.schema)) localStorage.setItem(LS.schema, '1');
}

/* ---------- photos in IndexedDB (localStorage can't hold images) ---------- */
let idb;
const idbReady = new Promise(res => {
  let rq;
  try { rq = indexedDB.open('better-photos', 1); } catch { return res(); }
  rq.onupgradeneeded = e => { const db = e.target.result; if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos'); };
  rq.onsuccess = e => { idb = e.target.result; res(); };
  rq.onerror = () => res();
});
const photoPut = (id, blob) => idbReady.then(() => new Promise(r => {
  if (!idb) return r();
  const t = idb.transaction('photos', 'readwrite');
  t.objectStore('photos').put(blob, id); t.oncomplete = r; t.onerror = r;
}));
const photoGet = id => idbReady.then(() => new Promise(r => {
  if (!idb || !id) return r(null);
  const rq = idb.transaction('photos').objectStore('photos').get(id);
  rq.onsuccess = () => r(rq.result || null); rq.onerror = () => r(null);
}));
const photoDel = id => idbReady.then(() => {
  if (idb && id) idb.transaction('photos', 'readwrite').objectStore('photos').delete(id);
  const u = urlCache.get(id); if (u){ URL.revokeObjectURL(u); urlCache.delete(id); }
});
const photoKeys = () => idbReady.then(() => new Promise(r => {
  if (!idb) return r([]);
  const rq = idb.transaction('photos').objectStore('photos').getAllKeys();
  rq.onsuccess = () => r(rq.result || []); rq.onerror = () => r([]);
}));
/* object URLs are cached per photo for the session; revoked on delete */
const urlCache = new Map();
async function photoURL(id){
  if (!id) return null;
  if (urlCache.has(id)) return urlCache.get(id);
  const b = await photoGet(id); if (!b) return null;
  const u = URL.createObjectURL(b); urlCache.set(id, u); return u;
}
/* fill every <img data-photo="id"> lazily.
   A plain rect sweep on scroll, not IntersectionObserver: the observer silently
   never fires in some contexts (hidden tab, a PWA restored from the background),
   which leaves every photo blank. */
const pendingImgs = new Set();
let hydrateWired = false;
async function showPhoto(img){
  const u = await photoURL(img.dataset.photo);
  if (u) img.src = u; else img.closest('.photo-wrap')?.remove();
}
function hydrateSweep(){
  for (const img of [...pendingImgs]){
    if (!img.isConnected || img.getAttribute('src')){ pendingImgs.delete(img); continue; }
    const r = img.getBoundingClientRect();
    if (r.top < window.innerHeight + 400 && r.bottom > -400){ pendingImgs.delete(img); showPhoto(img); }
  }
}
function hydratePhotos(root){
  (root || document).querySelectorAll('img[data-photo]:not([src])').forEach(i => pendingImgs.add(i));
  if (!hydrateWired){
    hydrateWired = true;
    window.addEventListener('scroll', hydrateSweep, { passive: true });
    window.addEventListener('resize', hydrateSweep);
  }
  hydrateSweep();
}
async function storePhoto(file, prefix, maxPx, q){
  const blob = await compressImage(file, maxPx, q);
  const id = prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  await photoPut(id, blob);
  return id;
}

/* ---------- helpers over the data ---------- */
const doneEntries = () => entries.filter(e => e.status === 'done');
const byTsDesc = (a, b) => b.ts - a.ts;
const byTsAsc  = (a, b) => a.ts - b.ts;
function upsert(list, item){ const i = list.findIndex(x => x.id === item.id); if (i >= 0) list[i] = item; else list.push(item); }

/* ---------- backup ---------- */
const blobToDataURL = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
const dataURLtoBlob = async u => (await fetch(u)).blob();
const backupDue = () => (entries.length + sessions.length + urges.length) >= 3 && Date.now() - (+localStorage.getItem(LS.backup) || 0) > 7*DAY;
const lastBackupLabel = () => { const l = +localStorage.getItem(LS.backup) || 0; return l ? 'Last backup ' + fmtShort(l) : 'No backup yet'; };

async function exportBackup(){
  const ids = new Set();
  entries.forEach(e => e.photoId && ids.add(e.photoId));
  inspo.forEach(i => i.photoId && ids.add(i.photoId));
  progress.forEach(p => p.photoId && ids.add(p.photoId));
  const head = { app:'better', version:1, exportedAt:new Date().toISOString(), settings, entries, sessions, urges, inspo, progress, weights, winsSeen };
  const parts = [JSON.stringify(head).slice(0, -1), ',"photos":{'];
  let first = true;
  for (const id of ids){
    const b = await photoGet(id); if (!b) continue;
    parts.push(`${first ? '' : ','}${JSON.stringify(id)}:${JSON.stringify(await blobToDataURL(b))}`); first = false;
  }
  parts.push('}}');
  const blob = new Blob(parts, { type:'application/json' });
  const name = `better-backup-${todayKey()}.json`;
  let shared = false;
  if (navigator.canShare && navigator.share){
    try { const f = new File([blob], name, { type:'application/json' }); if (navigator.canShare({ files:[f] })){ await navigator.share({ files:[f], title:name }); shared = true; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  if (!shared){
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  localStorage.setItem(LS.backup, Date.now());
  toast('Backup exported. Keep it somewhere safe.');
  rerender();
}
async function importBackupFile(file){
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'better') throw 0;
    const when = new Date(data.exportedAt).toLocaleDateString('en-GB');
    if (!confirm(`Import the backup from ${when}? This replaces everything in the app right now.`)) return;
    entries = data.entries || []; sessions = data.sessions || []; urges = data.urges || [];
    inspo = data.inspo || []; progress = data.progress || []; weights = data.weights || []; winsSeen = data.winsSeen || {};
    settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) }; settings.targets = { ...DEFAULT_SETTINGS.targets, ...(settings.targets || {}) };
    Object.values(commit).forEach(fn => fn());
    for (const [id, url] of Object.entries(data.photos || {})) await photoPut(id, await dataURLtoBlob(url));
    toast('Backup imported.');
    go('home');
  } catch { toast("That file doesn't look like a Better backup."); }
}
async function wipeAll(){
  if (!confirm('Delete EVERYTHING — meals, training, urges, photos, weight? There is no undo.')) return;
  if (!confirm('Really sure? Export a backup first if in doubt.')) return;
  entries = []; sessions = []; urges = []; inspo = []; weights = []; progress = []; winsSeen = {};
  settings = { ...DEFAULT_SETTINGS, targets: { ...DEFAULT_SETTINGS.targets } };
  runsCache = { fetchedAt: 0, lastSyncAt: 0, needsMfa: false, activities: [] };
  Object.values(LS).forEach(k => localStorage.removeItem(k));
  localStorage.setItem(LS.schema, '1');
  urlCache.forEach(u => URL.revokeObjectURL(u)); urlCache.clear();
  await idbReady; if (idb) idb.transaction('photos', 'readwrite').objectStore('photos').clear();
  toast('Everything cleared. Blank page.');
  go('home');
}
