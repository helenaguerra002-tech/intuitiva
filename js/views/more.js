/* ================= MORE ================= */
let morePage = null;   // null | 'inspo' | 'progress' | 'body' | 'settings' | 'backup'

function openMore(page){ morePage = page; go('more'); }
function moreBack(){ morePage = null; renderMore(); window.scrollTo(0, 0); }

function renderMore(){
  const el = $('#view-more');
  if (morePage === 'inspo')     return renderInspo(el);
  if (morePage === 'progress')  return renderProgress(el);
  if (morePage === 'body')      return renderBody(el);
  if (morePage === 'settings')  return renderSettings(el);
  if (morePage === 'backup')    return renderBackup(el);

  const wins = detectWins();
  el.innerHTML = `<div class="wrap">
    <div class="vh"><h1>More</h1></div>
    <div class="stack">
      ${backupDue() ? `<div class="banner"><span>Over a week without a backup.</span><button onclick="exportBackup()">Export</button></div>` : ''}
      <div class="card">
        <button class="menu-row" onclick="openMore('inspo')"><span class="l"><span class="g">✿</span>Inspiration</span><span class="r">${inspo.length || ''} ${ICON.chev}</span></button>
        <button class="menu-row" onclick="openMore('progress')"><span class="l"><span class="g">▦</span>Progress</span><span class="r">${wins.length} wins ${ICON.chev}</span></button>
        <button class="menu-row" onclick="openMore('body')"><span class="l"><span class="g">◇</span>Body</span><span class="r">${ICON.chev}</span></button>
      </div>
      <div class="card">
        <button class="menu-row" onclick="openMore('settings')"><span class="l"><span class="g">⚙</span>Settings</span><span class="r">${ICON.chev}</span></button>
        <button class="menu-row" onclick="openMore('backup')"><span class="l"><span class="g">💾</span>Backup</span><span class="r">${esc(lastBackupLabel())} ${ICON.chev}</span></button>
      </div>
      <div class="card pad"><div class="micro soft" style="margin-bottom:6px">Where your data lives</div>
        <div class="tiny" style="line-height:1.6">Everything is on this phone only — nothing is sent anywhere. Deleting the app or clearing site data loses it all. The export is your only safety net.</div></div>
      <div class="version">Better · ${APP_VERSION}</div>
    </div>
  </div>`;
}

/* ---------- inspiration ---------- */
function renderInspo(el){
  const body = inspo.filter(i => i.kind === 'body'), meal = inspo.filter(i => i.kind === 'meal');
  const tile = i => `<button class="ph" onclick="openInspo('${i.id}')">
      <img data-photo="${i.photoId}" alt="">
      ${settings.heroId === i.photoId ? `<span class="hero-tag">★</span>` : ''}
    </button>`;
  el.innerHTML = `<div class="wrap">
    <button class="back" onclick="moreBack()">${ICON.back} More</button>
    <div class="vh"><h1>Inspiration</h1><div class="side">${plural(inspo.length,'photo')}</div></div>
    <div class="stack">
      <div class="tiny">Add the pictures that remind you what you're working towards. They stay on this phone and go into your backup.</div>
      <div>
        <div class="sec-title"><h2>Where I'm headed</h2><button class="link" onclick="addInspo('body')">Add</button></div>
        <div class="grid3">${body.map(tile).join('') || ''}
          <button class="add" onclick="addInspo('body')">${ICON.plus}add</button></div>
      </div>
      <div>
        <div class="sec-title"><h2>Meals I want to make</h2><button class="link" onclick="addInspo('meal')">Add</button></div>
        <div class="grid3">${meal.map(tile).join('') || ''}
          <button class="add" onclick="addInspo('meal')">${ICON.plus}add</button></div>
      </div>
    </div>
  </div>`;
  hydratePhotos(el);
}
function addInspo(kind){
  pickFile('fileInMulti', async files => {
    let n = 0;
    for (const f of files){
      try { const photoId = await storePhoto(f, 'i', 1400, .8); inspo.push({ id: uid(), photoId, kind, addedAt: Date.now() }); n++; }
      catch {}
    }
    commit.inspo();
    if (n && !settings.heroId && kind === 'body'){ settings.heroId = inspo[inspo.length-1].photoId; commit.settings(); }
    renderMore();
    toast(n ? `${plural(n,'photo')} added.` : "Couldn't read those.");
  });
}
async function openInspo(id){
  const i = inspo.find(x => x.id === id); if (!i) return;
  const u = await photoURL(i.photoId);
  showSheet(`
    <div class="step"><span class="micro">${i.kind === 'body' ? 'Where I\'m headed' : 'Meal idea'}</span><button class="link soft" onclick="deleteInspo('${i.id}')">Delete</button></div>
    <div class="big-view">${u ? `<img src="${u}" alt="">` : '<div class="empty">Photo missing</div>'}</div>
    <div class="foot" style="margin-top:14px">
      <button class="btn ghost" onclick="closeSheet()">Close</button>
      <button class="btn" onclick="setHero('${i.photoId}')">${settings.heroId === i.photoId ? 'Already the home photo' : 'Use as home photo'}</button>
    </div>
  `, null);
}
function setHero(photoId){ settings.heroId = photoId; commit.settings(); closeSheet(); renderMore(); toast('Home photo set.'); }
function deleteInspo(id){
  if (!confirm('Remove this photo?')) return;
  const i = inspo.find(x => x.id === id);
  if (i){ if (settings.heroId === i.photoId){ settings.heroId = null; commit.settings(); } photoDel(i.photoId); }
  inspo = inspo.filter(x => x.id !== id); commit.inspo();
  closeSheet(); renderMore(); toast('Removed.');
}

/* ---------- progress ---------- */
function renderProgress(el){
  const wins = detectWins();
  const dn = dayNumber(), { total } = ymRange();
  const marked = Object.keys(dayMarks()).filter(k => k >= settings.startDate && k <= todayKey()).length;
  el.innerHTML = `<div class="wrap">
    <button class="back" onclick="moreBack()">${ICON.back} More</button>
    <div class="vh"><h1>Progress</h1><div class="side">Day ${dn} of ${total}</div></div>
    <div class="stack">
      <div class="card pad"><div class="stat-row">
        <div class="stat"><div class="n">${marked}</div><div class="l">days marked</div></div>
        <div class="stat"><div class="n">${Math.round(marked/Math.max(1,dn)*100)}%</div><div class="l">of days so far</div></div>
        <div class="stat"><div class="n">${daysLeft()}</div><div class="l">days left</div></div>
      </div></div>
      <div class="card pad">${renderYearMap(false)}</div>
      <div><div class="sec-title"><h2>All wins</h2><span class="tiny">${wins.length}</span></div>
        <div class="card pad" style="padding-top:2px;padding-bottom:2px">${winsHTML(wins)}</div></div>
    </div>
  </div>`;
  requestAnimationFrame(() => markWinsSeen(wins));
}

/* ---------- body ---------- */
function renderBody(el){
  const sorted = weights.slice().sort((a, b) => a.date - b.date);
  const latest = sorted[sorted.length - 1];
  const thisWeekLogged = latest && weekStart(latest.date) === weekStart(Date.now());

  /* 4-week trend: compare to the reading nearest 28 days back, at least 21 days apart */
  let trend = '';
  if (latest){
    const target = latest.date - 28*DAY;
    const older = sorted.filter(w => latest.date - w.date >= 21*DAY);
    if (older.length){
      const ref = older.reduce((best, w) => Math.abs(w.date - target) < Math.abs(best.date - target) ? w : best);
      const diff = latest.kg - ref.kg;
      const arrow = diff <= -0.5 ? '↓' : diff >= 0.5 ? '↑' : '→';
      trend = `${arrow} ${Math.abs(diff) < 0.05 ? 'steady' : (Math.abs(diff).toFixed(1) + ' kg')} vs ${fmtShort(ref.date)}`;
    }
  }
  /* sparkline */
  let spark = '';
  if (sorted.length > 1){
    const w = 300, h = 60, pad = 8;
    const xs = sorted.map((_, i) => pad + i*(w - 2*pad)/(sorted.length - 1));
    const min = Math.min(...sorted.map(s => s.kg)), max = Math.max(...sorted.map(s => s.kg));
    const span = (max - min) || 1;
    const ys = sorted.map(s => h - pad - (s.kg - min)/span*(h - 2*pad));
    const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    spark = `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="${pts}" fill="none" stroke="#5c7a3e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${xs.map((x, i) => `<circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="2.5" fill="#5c7a3e"/>`).join('')}</svg>
      <div class="tiny" style="display:flex;justify-content:space-between"><span>${fmtShort(sorted[0].date)} · ${sorted[0].kg} kg</span><span>${latest.kg} kg</span></div>`;
  }

  /* progress photos, one per month, next to the goal photo */
  const goalPhoto = settings.heroId || inspo.find(i => i.kind === 'body')?.photoId;
  const byMonth = progress.slice().sort(byTsDesc);
  const strip = byMonth.map(p => `<button class="s" onclick="openProgressPhoto('${p.id}')"><img data-photo="${p.photoId}" alt="">
      <span class="cap">${new Date(p.ts).toLocaleDateString('en-GB',{month:'short'})}</span></button>`).join('');
  const monthLogged = progress.some(p => new Date(p.ts).getMonth() === new Date().getMonth() && new Date(p.ts).getFullYear() === new Date().getFullYear());

  el.innerHTML = `<div class="wrap">
    <button class="back" onclick="moreBack()">${ICON.back} More</button>
    <div class="vh"><h1>Body</h1><div class="side">weekly · monthly</div></div>
    <div class="stack">
      <div class="card pad">
        <div class="micro soft">Weight · once a week is plenty</div>
        ${latest ? `<div class="w-now" style="margin-top:8px"><span class="n">${latest.kg}</span><span class="trend">kg · ${fmtShort(latest.date)}${trend ? ' · ' + trend : ''}</span></div>` : ''}
        ${spark}
        ${thisWeekLogged
          ? `<div class="tiny" style="margin-top:10px">Logged this week. <button class="link" onclick="redoWeight()">Change it</button></div>`
          : `<div class="row2" style="margin-top:10px"><input type="number" id="w-kg" inputmode="decimal" step="0.1" placeholder="kg"><button class="btn" onclick="saveWeight()">Save</button></div>`}
      </div>
      <div class="card pad">
        <div class="micro soft">Progress photo · once a month</div>
        <div class="compare" style="margin-top:10px">
          <div class="c">${byMonth[0] ? `<img data-photo="${byMonth[0].photoId}" alt=""><span class="cap">${new Date(byMonth[0].ts).toLocaleDateString('en-GB',{month:'short', year:'numeric'})}</span>` : '<div class="c none">No photo yet</div>'}</div>
          <div class="c">${goalPhoto ? `<img data-photo="${goalPhoto}" alt=""><span class="cap">where I'm headed</span>` : '<div class="c none">Add an inspiration photo</div>'}</div>
        </div>
        ${strip ? `<div class="strip" style="margin-top:10px">${strip}</div>` : ''}
        <button class="btn ghost olive" style="margin-top:10px" onclick="addProgressPhoto()">${monthLogged ? 'Add another photo' : 'Add this month\'s photo'}</button>
      </div>
      <div class="card pad"><div class="tiny" style="line-height:1.6">These live here, tucked away, on purpose. They are not the point of the day — the map on the home screen is.</div></div>
    </div>
  </div>`;
  hydratePhotos(el);
}
function saveWeight(){
  const v = parseFloat($('#w-kg').value);
  if (!(v > 30 && v < 250)) return toast('That number looks off.');
  weights.push({ date: Date.now(), kg: Math.round(v*10)/10 }); commit.weights();
  renderMore(); toast('Noted.');
}
function redoWeight(){
  const ws = weekStart(Date.now());
  weights = weights.filter(w => weekStart(w.date) !== ws); commit.weights();
  renderMore();
}
function addProgressPhoto(){
  pickFile('fileIn', async files => {
    try {
      const photoId = await storePhoto(files[0], 'g', 1000, .75);
      progress.push({ id: uid(), photoId, ts: Date.now(), note: '' }); commit.progress();
      renderMore(); toast('Photo saved.');
    } catch { toast("Couldn't read that photo."); }
  });
}
async function openProgressPhoto(id){
  const p = progress.find(x => x.id === id); if (!p) return;
  const u = await photoURL(p.photoId);
  showSheet(`
    <div class="step"><span class="micro">${fmtDay(p.ts)}</span><button class="link soft" onclick="deleteProgress('${p.id}')">Delete</button></div>
    <div class="big-view">${u ? `<img src="${u}" alt="">` : '<div class="empty">Photo missing</div>'}</div>
    <div class="foot" style="margin-top:14px"><button class="btn ghost" onclick="closeSheet()">Close</button></div>
  `, null);
}
function deleteProgress(id){
  if (!confirm('Delete this photo?')) return;
  const p = progress.find(x => x.id === id); if (p) photoDel(p.photoId);
  progress = progress.filter(x => x.id !== id); commit.progress();
  closeSheet(); renderMore(); toast('Deleted.');
}

/* ---------- settings ---------- */
function renderSettings(el){
  const t = settings.targets;
  el.innerHTML = `<div class="wrap">
    <button class="back" onclick="moreBack()">${ICON.back} More</button>
    <div class="vh"><h1>Settings</h1></div>
    <div class="stack">
      <div class="card pad">
        <div class="micro soft" style="margin-bottom:10px">A good week</div>
        <div class="field"><label>Runs per week</label>
          <input type="number" id="t-runs" min="0" max="14" value="${t.runs}" onchange="saveTargets()"></div>
        <div class="field" style="margin-bottom:0"><label>Strength sessions per week</label>
          <input type="number" id="t-str" min="0" max="14" value="${t.strength}" onchange="saveTargets()"></div>
      </div>
      <div class="card pad">
        <div class="toggle"><div><b style="font-weight:600">Show calories and macros</b>
          <div class="tiny">Off by default, on purpose. Turning this on adds optional number fields to the after-meal page.</div></div>
          <button class="sw ${settings.showMacros ? 'on' : ''}" onclick="toggleMacros()" aria-label="Toggle calories"></button></div>
      </div>
      <div class="card pad">
        <div class="field" style="margin-bottom:0"><label>Day 1</label>
          <input type="date" id="s-start" value="${settings.startDate}" max="${settings.endDate}" onchange="saveStart()">
          <div class="hint">The map runs from here to 31 December. Currently ${ymRange().total} days.</div></div>
      </div>
      <div class="card pad">
        <div class="field" style="margin-bottom:0"><label>Running app address</label>
          <input type="text" id="s-api" value="${esc(settings.runsApi)}" onchange="saveApi()">
          <div class="hint">Where runs are pulled from. Leave it unless the address changes.</div></div>
      </div>
    </div>
  </div>`;
}
function saveTargets(){
  settings.targets = { runs: clamp(+$('#t-runs').value || 0, 0, 14), strength: clamp(+$('#t-str').value || 0, 0, 14) };
  commit.settings(); toast('Targets updated.');
}
function toggleMacros(){ settings.showMacros = !settings.showMacros; commit.settings(); renderMore(); toast(settings.showMacros ? 'Numbers are available now.' : 'Numbers hidden again.'); }
function saveStart(){
  const v = $('#s-start').value; if (!v) return;
  settings.startDate = v; commit.settings(); renderMore(); toast('Day 1 updated.');
}
function saveApi(){ settings.runsApi = $('#s-api').value.trim().replace(/\/$/, '') || DEFAULT_SETTINGS.runsApi; commit.settings(); refreshRuns(true); }

/* ---------- backup ---------- */
function renderBackup(el){
  el.innerHTML = `<div class="wrap">
    <button class="back" onclick="moreBack()">${ICON.back} More</button>
    <div class="vh"><h1>Backup</h1><div class="side">${esc(lastBackupLabel())}</div></div>
    <div class="stack">
      <div class="card pad"><div class="tiny" style="line-height:1.6">Everything lives in this phone's browser. The export is one JSON file with every meal, session, urge and photo. Keep it in Files or email it to yourself.</div></div>
      <button class="btn" onclick="exportBackup()">Export backup</button>
      <button class="btn ghost" onclick="pickFile('fileJson', f => importBackupFile(f[0]))">Import a backup</button>
      <div class="card pad">
        <div class="stat-row">
          <div class="stat"><div class="n">${entries.length}</div><div class="l">meals</div></div>
          <div class="stat"><div class="n">${sessions.length}</div><div class="l">sessions</div></div>
          <div class="stat"><div class="n">${urges.length}</div><div class="l">urges</div></div>
        </div>
        <div class="stat-row" style="margin-top:8px">
          <div class="stat"><div class="n">${inspo.length}</div><div class="l">inspiration</div></div>
          <div class="stat"><div class="n">${progress.length}</div><div class="l">progress</div></div>
          <div class="stat"><div class="n">${weights.length}</div><div class="l">weigh-ins</div></div>
        </div>
      </div>
      <button class="btn danger" onclick="wipeAll()">Delete everything</button>
      <div class="version">Better · ${APP_VERSION}</div>
    </div>
  </div>`;
}
