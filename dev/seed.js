/* dev only — never precached, never shipped in the nav. Open index.html?dev=1 */
(function(){
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99;background:#1a1a1a;color:#fff;font:11px system-ui;padding:6px 10px;display:flex;gap:10px;align-items:center';
  bar.innerHTML = `<b>dev</b>
    <button id="d-seed" style="background:#5c7a3e;color:#fff;border:0;padding:4px 8px;border-radius:4px">seed 40 days</button>
    <button id="d-runs" style="background:#333;color:#fff;border:0;padding:4px 8px;border-radius:4px">fake runs</button>
    <button id="d-clear" style="background:#b84444;color:#fff;border:0;padding:4px 8px;border-radius:4px">clear</button>
    <span id="d-info" style="opacity:.7"></span>`;
  document.body.appendChild(bar);
  const info = () => document.getElementById('d-info').textContent =
    `${entries.length} meals · ${sessions.length} sessions · ${urges.length} urges · ${(runsCache.activities||[]).length} runs`;

  const pick = a => a[Math.floor(Math.random()*a.length)];
  const some = (a, n) => a.slice().sort(() => Math.random()-.5).slice(0, n).map(x => x[0]);

  document.getElementById('d-seed').onclick = () => {
    const days = 40;
    for (let d = days; d >= 0; d--){
      const base = new Date(); base.setDate(base.getDate() - d); base.setHours(0,0,0,0);
      const nMeals = 2 + Math.floor(Math.random()*3);
      for (let i = 0; i < nMeals; i++){
        const ts = base.getTime() + (8 + i*4 + Math.random()*2)*36e5;
        if (ts > Date.now()) continue;
        const before = 2 + Math.floor(Math.random()*4);
        const after = Math.min(10, before + 3 + Math.floor(Math.random()*4));
        entries.push({ id: uid()+d+i, ts, foods: pick(['rice, beans, chicken','yogurt and granola','pasta with tomato','eggs and toast','salad and salmon','sandwich','soup','pizza']),
          photoId:null, hungerBefore: before, fullnessAfter: after, protein: Math.random() > .4,
          satisfied: pick(['yes','yes','partly','no']), feelings: some(MEAL_FEELINGS, 2), feelingNote:'',
          context: some(MEAL_CONTEXTS, 1), status:'done',
          overate: after >= 9 ? 'yes' : after === 8 ? 'bit' : 'no',
          preceded: after >= 8 ? some(MEAL_PRECEDED, 2) : [], macros:null });
      }
      if (Math.random() > .65) sessions.push({ id: uid()+'s'+d, ts: base.getTime() + 18*36e5, focus: pick(['fullbody','mobility']), rpe: 4 + Math.floor(Math.random()*5), note:'' });
      if (Math.random() > .7){
        const ts = base.getTime() + (15 + Math.random()*7)*36e5;
        if (ts < Date.now()) urges.push({ id: uid()+'u'+d, ts, intensity: 3 + Math.floor(Math.random()*7),
          triggers: some(URGE_TRIGGERS, 2), surfSeconds: pick([90,120,180]), sensations: some(URGE_BODY, 2),
          feelings: some(URGE_FEELINGS, 2), outcome: pick(['passed','passed','passed','normal','acted']), note:'' });
      }
    }
    commit.entries(); commit.sessions(); commit.urges();
    rerender(); info();
  };
  document.getElementById('d-runs').onclick = () => {
    const acts = [];
    for (let d = 40; d >= 0; d--){
      if (Math.random() > .45) continue;
      const dt = new Date(); dt.setDate(dt.getDate() - d); dt.setHours(7, 30, 0, 0);
      if (dt > new Date()) continue;
      const km = Math.round((4 + Math.random()*11) * 10)/10;
      acts.push({ activity_id: 1000 + d, name: pick(['Morning Run','Evening Run','Long Run','Easy Run']),
        start_time: `${dayKey(dt)} ${String(dt.getHours()).padStart(2,'0')}:30:00`,
        distance_km: km, avg_pace: `${5 + Math.floor(Math.random()*2)}:${String(10 + Math.floor(Math.random()*49)).padStart(2,'0')}`,
        avg_hr: 145 + Math.floor(Math.random()*30), duration_s: Math.round(km*5.8*60), activity_type_key:'running' });
    }
    runsCache.activities = acts.sort((a,b) => runTs(b) - runTs(a)); runsCache.fetchedAt = Date.now(); commit.runs();
    runsState = 'ok'; rerender(); info();
  };
  document.getElementById('d-clear').onclick = () => {
    entries = []; sessions = []; urges = []; winsSeen = {};
    runsCache = { fetchedAt:0, lastSyncAt:0, needsMfa:false, activities:[] };
    commit.entries(); commit.sessions(); commit.urges(); commit.winsSeen(); commit.runs();
    rerender(); info();
  };
  info();
})();
