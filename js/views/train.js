/* ================= TRAIN ================= */
const STRENGTH_FOCUS = [['fullbody','Full body / circuit'], ['mobility','Pilates / yoga / mobility']];
const focusLabel = Object.fromEntries(STRENGTH_FOCUS);

function renderTrain(){
  const el = $('#view-train');
  const t = settings.targets;
  const ws = weekStart(Date.now()), st = weekStats(ws);
  const pills = (n, target, ink) => {
    let h = '';
    for (let i = 0; i < Math.max(target, n); i++) h += `<span class="pill ${ink ? 'ink' : ''} ${i < n ? (i < target ? 'on' : 'on extra') : ''}"></span>`;
    return `<div class="pills">${h}</div>`;
  };

  /* merged activity list */
  const items = [
    ...(runsCache.activities || []).map(r => ({ kind:'run', ts: runTs(r), r })),
    ...sessions.map(s => ({ kind:'strength', ts: s.ts, s })),
  ].sort(byTsDesc).slice(0, 30);

  const list = items.length ? items.map(it => it.kind === 'run' ? runRow(it.r) : sessionRow(it.s)).join('')
    : `<div class="empty"><div class="glyph">▮</div>Nothing here yet.<br>Log a session, or sync a run.</div>`;

  /* last 4 weeks */
  const weeks = [];
  for (let i = 3; i >= 0; i--){
    const w = ws - i*7*DAY, s = weekStats(w);
    weeks.push({ w, ...s });
  }
  const maxCount = Math.max(1, ...weeks.map(w => w.runs + w.strength));
  const bars = weeks.map(w => {
    const h = 52;
    const rh = Math.round(w.runs / maxCount * h), sh = Math.round(w.strength / maxCount * h);
    return `<div class="b"><div class="col">
        ${w.strength ? `<div class="seg-s" style="height:${sh}px"></div>` : ''}
        ${w.runs ? `<div class="seg-r" style="height:${rh}px"></div>` : ''}
      </div><span class="wk">${w.w === ws ? 'now' : fmtShort(w.w).replace(/ \w+$/, m => m)}</span></div>`;
  }).join('');

  el.innerHTML = `<div class="wrap">
    <div class="vh"><h1>Train</h1><div class="side">${plural(sessions.length,'session')} · ${plural((runsCache.activities||[]).length,'run')}</div></div>
    <div class="stack">
      <div class="card pad">
        <div class="micro soft" style="margin-bottom:6px">This week · from ${fmtShort(ws)}</div>
        <div class="week-row"><span class="lab">Runs</span>${pills(st.runs, t.runs)}<span class="val">${st.runs}/${t.runs}</span></div>
        <div class="week-row"><span class="lab">Strength</span>${pills(st.strength, t.strength, true)}<span class="val">${st.strength}/${t.strength}</span></div>
        <div class="stat-row" style="margin-top:10px">
          <div class="stat"><div class="n">${fmtKm(st.km).replace(' km','')}</div><div class="l">km this week</div></div>
          <div class="stat"><div class="n">${st.runs + st.strength}</div><div class="l">of ${t.runs + t.strength} days</div></div>
          <div class="stat"><div class="n">${weeks.filter(w => w.runs >= t.runs && w.strength >= t.strength).length}</div><div class="l">full weeks / 4</div></div>
        </div>
      </div>
      <button class="btn" onclick="openStrengthSheet()">Log a strength session</button>
      <div class="card pad">
        <div class="micro soft">Last 4 weeks</div>
        <div class="bars4">${bars}</div>
        <div class="legend"><span><i class="run"></i>runs</span><span><i class="str"></i>strength</span></div>
      </div>
      <div>
        <div class="sec-title"><h2>Recent</h2><button class="link" onclick="refreshRuns(true)">Sync runs</button></div>
        <div class="tiny" style="margin-bottom:8px">${esc(runsStatusLine())}</div>
        <div class="card pad">${list}</div>
      </div>
    </div>
  </div>`;
}

function runRow(r){
  const km = +r.distance_km || 0;
  const mins = Math.round((+r.duration_s || 0)/60);
  return `<div class="rowitem"><div class="ic olive">${ICON.run}</div>
    <div class="mid"><b>${esc(r.name || 'Run')}</b>
      <div class="sub">${relDay(runTs(r))} · ${r.avg_pace && r.avg_pace !== '--:--' ? r.avg_pace + '/km' : plural(mins,'min')}${r.avg_hr ? ' · ' + r.avg_hr + ' bpm' : ''}</div></div>
    <div class="right"><b>${fmtKm(km)}</b>${plural(mins,'min')}</div></div>`;
}
function sessionRow(s){
  return `<button class="rowitem" onclick="editSession('${s.id}')"><div class="ic">${ICON.str}</div>
    <div class="mid"><b>${esc(focusLabel[s.focus] || s.focus)}</b>
      <div class="sub">${relDay(s.ts)} · ${fmtTime(s.ts)}${s.note ? ' · ' + esc(s.note) : ''}</div></div>
    <div class="right"><b>RPE ${s.rpe}</b>${esc(RPE_WORDS[s.rpe] || '')}</div></button>`;
}

/* ---------- strength sheet ---------- */
let sessionState = null;
function openStrengthSheet(existing){
  sessionState = existing ? { ...existing } : { id: uid(), ts: Date.now(), focus:'fullbody', rpe:6, note:'' };
  const d = sessionState;
  showSheet(`
    <div class="step"><span class="micro">${existing ? 'Edit' : '02'} · Strength</span>${existing ? `<button class="link soft" onclick="deleteSession()">Delete</button>` : ''}</div>
    <h2>${existing ? 'Edit session' : 'Session done'}</h2>
    <div class="sub">Quick. Just enough to see it on the map.</div>
    <div class="field"><label>What kind?</label>
      <div class="seg" id="s-focus">${STRENGTH_FOCUS.map(([k, l]) => `<button type="button" data-k="${k}" class="${d.focus === k ? 'on' : ''}" onclick="pickOne(this)">${l}</button>`).join('')}</div></div>
    <div class="field"><label>How hard did it feel?</label>
      <input type="range" class="plain" id="s-rpe" min="1" max="10" value="${d.rpe}" oninput="rpeRead()">
      <div class="scale-read"><span class="n" id="rpe-n">${d.rpe}</span><span class="w" id="rpe-w">${RPE_WORDS[d.rpe]}</span></div></div>
    <div class="field"><label for="s-when">When</label><input type="datetime-local" id="s-when" value="${toLocalInput(d.ts)}"></div>
    <div class="field"><label>Note</label><textarea id="s-note" placeholder="optional — what you did, how it felt">${esc(d.note)}</textarea></div>
    <div class="foot"><button class="btn ghost" onclick="closeSheet()">Cancel</button><button class="btn" onclick="saveSession()">Save</button></div>
  `, null);
}
function rpeRead(){ const v = +$('#s-rpe').value; $('#rpe-n').textContent = v; $('#rpe-w').textContent = RPE_WORDS[v]; }
function saveSession(){
  const d = sessionState;
  d.focus = segValue('#s-focus') || 'fullbody';
  d.rpe = +$('#s-rpe').value;
  d.note = $('#s-note').value.trim();
  const when = $('#s-when').value; if (when) d.ts = new Date(when).getTime();
  upsert(sessions, d); commit.sessions();
  closeSheet(); rerender();
  toast('Session logged.');
}
function editSession(id){ const s = sessions.find(x => x.id === id); if (s) openStrengthSheet(s); }
function deleteSession(){
  if (!confirm('Delete this session?')) return;
  sessions = sessions.filter(s => s.id !== sessionState.id); commit.sessions();
  closeSheet(); rerender(); toast('Session deleted.');
}
