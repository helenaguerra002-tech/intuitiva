/* ================= URGES — RAIN ================= */
const URGE_TRIGGERS = [['stressed','stressed'],['bored','bored'],['tired','tired'],['saw-food','saw food'],['just-ate','just ate'],['restricted','ate too little earlier'],['lonely','lonely'],['habit','habit / this time of day'],['social','around people'],['scrolling','scrolling'],['alone-home','home alone'],['upset','something upset me']];
const URGE_BODY = [['chest','tight chest'],['restless','restless'],['stomach','empty stomach'],['jaw','clenched jaw'],['buzzing','buzzing / wired'],['heavy','heavy'],['numb','numb'],['throat','lump in throat'],['nothing','not much, actually']];
const URGE_FEELINGS = [['tired','tired'],['anxious','anxious'],['bored','bored'],['lonely','lonely'],['sad','sad'],['overwhelmed','overwhelmed'],['angry','angry'],['break','I want a break'],['hungry','actually hungry']];
const urgeTrigLabel = Object.fromEntries(URGE_TRIGGERS);
const OUTCOME_LABEL = { passed:'it passed', normal:'ate a normal portion', acted:'acted on it' };

function renderUrges(){
  const el = $('#view-urges');
  const list = urges.slice().sort(byTsDesc);
  const surfed = urges.filter(u => u.outcome !== 'acted').length;
  const recent = list.slice(0, 12);
  let streak = 0;
  for (const u of list){ if (u.outcome === 'acted') break; streak++; }

  el.innerHTML = `<div class="wrap">
    <div class="vh"><h1>Urges</h1><div class="side">${plural(urges.length,'urge')} noticed</div></div>
    <div class="stack">
      <button class="btn" onclick="startSurf()">Surf an urge</button>
      ${urges.length ? `<div class="card pad"><div class="stat-row">
        <div class="stat"><div class="n">${urges.length}</div><div class="l">noticed</div></div>
        <div class="stat"><div class="n">${surfed}</div><div class="l">not acted on</div></div>
        <div class="stat"><div class="n">${streak}</div><div class="l">in a row</div></div>
      </div><div class="p-note">Every urge you watch instead of obey teaches the brain that the wave passes on its own.</div></div>` : ''}
      ${recent.length ? `<div><div class="sec-title"><h2>Recent</h2></div><div class="card pad">${recent.map(urgeRow).join('')}</div></div>` : ''}
      <div><div class="sec-title"><h2>Learn</h2></div>${learnHTML()}</div>
      ${!urges.length ? `<div class="card"><div class="empty"><div class="glyph">〰</div>Nothing logged yet.<br>Next time a wave comes, open this and ride it.</div></div>` : ''}
    </div>
  </div>`;
}
function urgeRow(u){
  const tri = (u.triggers || []).map(t => urgeTrigLabel[t] || t).slice(0, 3).join(', ');
  return `<div class="rowitem"><div class="urge-int">${u.intensity}</div>
    <div class="mid"><b>${OUTCOME_LABEL[u.outcome] || '—'}</b>
      <div class="sub">${relDay(u.ts)} ${fmtTime(u.ts)}${tri ? ' · ' + esc(tri) : ''}</div></div>
    <div class="right">${u.surfSeconds ? Math.round(u.surfSeconds/60*10)/10 + ' min' : ''}</div></div>`;
}

/* ---------- the flow ---------- */
let urgeState = null;   // {data, endAt, iv, vis, lock}

function startSurf(){
  urgeState = { data: { id: uid(), ts: Date.now(), intensity: 6, triggers: [], surfSeconds: 0, sensations: [], feelings: [], outcome: null, note: '' } };
  urgeRecognize();
}
function urgeRecognize(){
  const d = urgeState.data;
  showSheet(`
    <div class="step"><span class="micro">01 · Recognise</span><button class="link soft" onclick="closeSheet()">Not now</button></div>
    <h2>There it is.</h2>
    <div class="sub">Drop your shoulders. Unclench your jaw. Nothing has gone wrong.</div>
    <div class="field"><label>How strong is it?</label>
      <input type="range" class="plain" id="u-int" min="1" max="10" value="${d.intensity}" oninput="$('#u-int-n').textContent=this.value">
      <div class="scale-read"><span class="n" id="u-int-n">${d.intensity}</span><span class="w">1 is a whisper, 10 is a roar</span></div></div>
    <div class="field"><label>What happened right before?</label><div class="chips" id="u-trig">${chipsHTML(URGE_TRIGGERS, d.triggers)}</div>
      <div class="hint">Mapping the loop is the first gear. No wrong answers.</div></div>
    <div class="foot"><button class="btn" onclick="goAllow()">Next</button></div>
  `, stopSurfTimer);
}
function goAllow(){
  urgeState.data.intensity = +$('#u-int').value;
  urgeState.data.triggers = selKeys('#u-trig');
  urgeAllowPick();
}
function urgeAllowPick(){
  showSheet(`
    <div class="step"><span class="micro">02 · Allow</span><button class="link soft" onclick="urgeRecognize()">Back</button></div>
    <h2>Let it be here.</h2>
    <div class="sub">You are not fixing it or fighting it. You are watching a wave from the beach. Cravings peak and pass, usually inside 90 seconds of real attention.</div>
    <div class="row3">
      <button class="btn ghost" onclick="runSurf(90)">90 sec</button>
      <button class="btn ghost" onclick="runSurf(120)">2 min</button>
      <button class="btn ghost" onclick="runSurf(180)">3 min</button>
    </div>
    <div style="margin-top:12px"><button class="link soft" onclick="urgeInvestigate()">Skip the timer</button></div>
  `, stopSurfTimer);
}
function runSurf(secs){
  urgeState.data.surfSeconds = secs;
  urgeState.endAt = Date.now() + secs*1000;
  showSheet(`
    <div class="step"><span class="micro">02 · Allow</span><button class="link soft" onclick="stopSurfTimer();urgeAllowPick()">Back</button></div>
    <div class="surf">
      <div class="breath" id="breathEl"><div style="text-align:center">
        <div class="t" id="surf-time">${fmtClock(secs*1000)}</div>
        <div class="cue" id="surf-cue">breathe in</div></div></div>
      <div class="copy">Nothing to do. Notice where it lives in your body and keep it company until the timer runs out.</div>
      <div class="ready" id="surf-ready"><button class="link" onclick="stopSurfTimer();urgeInvestigate()">I'm ready</button></div>
    </div>
  `, stopSurfTimer);
  startSurfTimer();
}
function startSurfTimer(){
  const tick = () => {
    if (!urgeState || !urgeState.endAt) return;
    const left = Math.max(0, urgeState.endAt - Date.now());
    const t = $('#surf-time'); if (!t) return stopSurfTimer();
    t.textContent = fmtClock(left);
    const cue = $('#surf-cue');
    if (cue){ const phase = (urgeState.data.surfSeconds*1000 - left) % 10000; cue.textContent = phase < 4000 ? 'breathe in' : 'breathe out'; }
    const total = urgeState.data.surfSeconds * 1000;
    if (total - left >= 30000) $('#surf-ready')?.classList.add('on');
    if (left <= 0){ stopSurfTimer(); urgeInvestigate(); }
  };
  urgeState.iv = setInterval(tick, 250);
  urgeState.vis = () => { if (document.visibilityState === 'visible') tick(); };
  document.addEventListener('visibilitychange', urgeState.vis);
  if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { if (urgeState) urgeState.lock = l; }).catch(() => {});
  tick();
}
function stopSurfTimer(){
  if (!urgeState) return;
  clearInterval(urgeState.iv); urgeState.iv = null;
  if (urgeState.vis){ document.removeEventListener('visibilitychange', urgeState.vis); urgeState.vis = null; }
  if (urgeState.lock){ try { urgeState.lock.release(); } catch {} urgeState.lock = null; }
  urgeState.endAt = null;
}
function urgeInvestigate(){
  const d = urgeState.data;
  showSheet(`
    <div class="step"><span class="micro">03 · Investigate</span><button class="link soft" onclick="urgeAllowPick()">Back</button></div>
    <h2>What does it feel like?</h2>
    <div class="sub">Curiosity and contraction can't coexist. Look at the body, not the story.</div>
    <div class="field"><label>In the body</label><div class="chips" id="u-body">${chipsHTML(URGE_BODY, d.sensations)}</div></div>
    <div class="field"><label>What am I really feeling?</label><div class="chips" id="u-feel">${chipsHTML(URGE_FEELINGS, d.feelings)}</div></div>
    <div class="field"><label>What would eating give me right now?</label>
      <textarea id="u-note" placeholder="optional — and is it as good as it promises?">${esc(d.note)}</textarea></div>
    <div class="foot"><button class="btn" onclick="goNote()">Next</button></div>
  `, stopSurfTimer);
}
function goNote(){
  const d = urgeState.data;
  d.sensations = selKeys('#u-body');
  d.feelings = selKeys('#u-feel');
  d.note = $('#u-note').value.trim();
  urgeNote();
}
function urgeNote(){
  showSheet(`
    <div class="step"><span class="micro">04 · Note</span><button class="link soft" onclick="urgeInvestigate()">Back</button></div>
    <h2>How did it go?</h2>
    <div class="sub">All three are worth logging. None of them is a failure.</div>
    <div class="outcome">
      <button onclick="saveUrge('passed')">It passed<span>The wave came and went.</span></button>
      <button onclick="saveUrge('normal')">I ate a normal portion<span>Ate, and stopped.</span></button>
      <button onclick="saveUrge('acted')">I acted on it<span>A habit fired. Nothing to make up for — eat normally next meal.</span></button>
    </div>
  `, stopSurfTimer);
}
function saveUrge(outcome){
  stopSurfTimer();
  const d = urgeState.data;
  d.outcome = outcome;
  urges.push(d); commit.urges();
  closeSheet(); rerender();
  toast('Logged. Noticing is the practice.');
}
