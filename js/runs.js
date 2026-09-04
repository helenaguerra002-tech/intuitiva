/* ================= runs from the running app (Garmin via Render) ================= */
let runsState = runsCache.activities.length ? 'ok' : 'idle';   // idle | waking | updating | ok | offline | error
let runsRefreshing = false;

const runDate = r => new Date(String(r.start_time).replace(' ', 'T'));   // Garmin local time, no Z
const runDay  = r => String(r.start_time).slice(0, 10);
const runTs   = r => runDate(r).getTime();

function fetchJSON(url, ms){
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  return fetch(url, { signal: ac.signal, cache: 'no-store' })
    .then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
    .finally(() => clearTimeout(t));
}

async function refreshRuns(force){
  if (runsRefreshing) return runsCache;
  if (!navigator.onLine){ runsState = 'offline'; return runsCache; }
  // don't re-fetch on every tab focus; Render cold-starts are slow and this is her only server
  if (!force && runsCache.fetchedAt && Date.now() - runsCache.fetchedAt < 60e3){ runsState = 'ok'; return runsCache; }
  runsRefreshing = true;
  runsState = runsCache.activities.length ? 'updating' : 'waking';
  rerenderIf(['home', 'train']);
  const api = settings.runsApi.replace(/\/$/, '');
  try {
    const now = Date.now();
    if (force || now - (runsCache.lastSyncAt || 0) > 5*60e3){
      runsCache.lastSyncAt = now; commit.runs();               // stamp first so a failure can't hammer Garmin
      try { const s = await fetchJSON(`${api}/api/sync`, 60e3); runsCache.needsMfa = !!s.needs_mfa; }
      catch { /* sync failing is not fatal — the cached list on the server may still be fine */ }
    }
    const acts = await fetchJSON(`${api}/api/activities`, 60e3);
    if (Array.isArray(acts)){ runsCache.activities = acts; runsCache.fetchedAt = now; commit.runs(); }
    runsState = 'ok';
  } catch (e) {
    runsState = navigator.onLine ? 'error' : 'offline';
  } finally {
    runsRefreshing = false;
    rerenderIf(['home', 'train']);
  }
  return runsCache;
}

function runsStatusLine(){
  const at = runsCache.fetchedAt ? `updated ${fmtShort(runsCache.fetchedAt)} ${fmtTime(runsCache.fetchedAt)}` : '';
  switch (runsState){
    case 'waking':   return 'Waking the running app… this can take half a minute.';
    case 'updating': return 'Updating runs…';
    case 'offline':  return runsCache.fetchedAt ? `Offline · runs ${at}` : 'Offline · no runs cached yet.';
    case 'error':    return runsCache.fetchedAt ? `Couldn't reach the running app · showing runs ${at}` : "Couldn't reach the running app.";
    case 'ok':
      if (!runsCache.activities.length) return runsCache.needsMfa
        ? 'Garmin needs a fresh login — open the running app and tap Sync once.'
        : 'No runs synced yet — open the running app and tap Sync once.';
      return `Runs ${at}`;
    default: return '';
  }
}

/* weekly aggregation, Mon–Sun */
const runsInWeek = ws => runsCache.activities.filter(r => weekStart(runTs(r)) === ws);
const sessionsInWeek = ws => sessions.filter(s => weekStart(s.ts) === ws);
function weekStats(ws){
  const rs = runsInWeek(ws);
  return { runs: rs.length, km: rs.reduce((s, r) => s + (+r.distance_km || 0), 0), strength: sessionsInWeek(ws).length,
           meals: entries.filter(e => weekStart(e.ts) === ws).length, urges: urges.filter(u => weekStart(u.ts) === ws).length };
}
const fmtKm = km => (Math.round(km*10)/10).toFixed(1).replace(/\.0$/, '') + ' km';
