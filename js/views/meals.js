/* ================= MEALS ================= */
const MEAL_CONTEXTS = [['physical','🍽 physical hunger'],['craving','✨ specific craving'],['boredom','😪 boredom'],['anxiety','🌧 anxiety'],['social','👯 social'],['schedule','⏰ it was time']];
const MEAL_FEELINGS = [['light','light'],['good','good'],['happy','happy'],['calm','calm'],['heavy','heavy'],['bloated','bloated'],['sleepy','sleepy'],['guilty','guilty'],['still-craving','still craving']];
const MEAL_PRECEDED = [['skipped','skipped a meal'],['long-gap','long gap since eating'],['stressed','stressed'],['tired','tired'],['bored','bored'],['social','with people'],['distracted','distracted / screen'],['too-fast','ate very fast'],['after-workout','after training'],['low-protein','light on protein']];
const mealCtxLabel = Object.fromEntries(MEAL_CONTEXTS);
const mealFeelLabel = Object.fromEntries(MEAL_FEELINGS);
const mealPrecLabel = Object.fromEntries(MEAL_PRECEDED);
const SAT_LABEL = { yes:'it satisfied me', partly:'sort of', no:"not what I wanted" };
const OVER_LABEL = { no:'stopped in time', bit:'a bit past full', yes:'overate' };

let mealsShowAll = false;

function renderMeals(){
  const el = $('#view-meals');
  const open = entries.find(e => e.status === 'open');
  const sorted = entries.slice().sort(byTsDesc);
  const cutoff = Date.now() - 14*DAY;
  const shown = mealsShowAll ? sorted : sorted.filter(e => e.ts >= cutoff);
  const hiddenCount = sorted.length - shown.length;

  let feed = '';
  if (!sorted.length){
    feed = `<div class="card"><div class="empty"><div class="glyph">🍽</div>Nothing logged yet.<br>When you eat something, tell me.</div></div>`;
  } else {
    let lastDay = '';
    for (const e of shown){
      const k = dayKey(e.ts);
      if (k !== lastDay){
        const dayEntries = entries.filter(x => dayKey(x.ts) === k);
        feed += `<div class="day-head"><b>${relDay(e.ts)}</b><span class="tiny">${plural(dayEntries.length, 'meal')}</span></div>`;
        lastDay = k;
      }
      feed += mealCard(e);
    }
    if (hiddenCount > 0) feed += `<button class="btn ghost" style="margin-top:16px" onclick="mealsShowAll=true;renderMeals()">Show ${hiddenCount} earlier ${hiddenCount === 1 ? 'meal' : 'meals'}</button>`;
  }

  el.innerHTML = `<div class="wrap">
    <div class="vh"><h1>Meals</h1><div class="side">${plural(entries.length,'meal')} logged</div></div>
    <div class="stack">
      ${open ? `<div class="open-banner"><span><b>${esc(open.foods) || 'Meal'}</b> at ${fmtTime(open.ts)} is still open</span><button class="link" onclick="finishEntry('${open.id}')">Finish</button></div>` : ''}
      <button class="btn" onclick="openMealSheet()">Log a meal</button>
    </div>
    ${feed}
    ${renderPatterns()}
  </div>`;
  hydratePhotos(el);
}

function mealCard(e){
  const all = entries.slice().sort(byTsAsc);
  const idx = all.findIndex(x => x.id === e.id);
  const next = all[idx + 1];
  let held = '';
  if (e.status === 'done' && next){
    const gap = next.ts - e.ts;
    if (gap > 20*6e4 && gap < 10*36e5) held = `<div class="held">Held you for ${fmtDur(gap)}</div>`;
  }
  const chips = [
    ...(e.context || []).map(c => `<span class="mini-chip">${esc(mealCtxLabel[c] || c)}</span>`),
    ...(e.protein ? ['<span class="mini-chip olive">protein</span>'] : []),
    ...(e.satisfied ? [`<span class="mini-chip ${e.satisfied === 'yes' ? 'olive' : ''}">${SAT_LABEL[e.satisfied]}</span>`] : []),
    ...(e.overate && e.overate !== 'no' ? [`<span class="mini-chip">${OVER_LABEL[e.overate]}</span>`] : []),
    ...(e.preceded || []).map(p => `<span class="mini-chip">${esc(mealPrecLabel[p] || p)}</span>`),
    ...(e.feelings || []).map(f => `<span class="mini-chip">${esc(mealFeelLabel[f] || f)}</span>`),
  ].join('');
  const m = e.macros;
  const macroLine = (settings.showMacros && m && (m.kcal || m.protein || m.carbs || m.fat))
    ? `<div class="tiny" style="margin-top:6px">${[m.kcal && m.kcal + ' kcal', m.protein && 'P ' + m.protein + 'g', m.carbs && 'C ' + m.carbs + 'g', m.fat && 'F ' + m.fat + 'g'].filter(Boolean).join(' · ')}</div>` : '';
  return `<div class="card meal" style="margin-bottom:14px">
    ${e.photoId ? `<div class="photo-wrap"><img class="photo" data-photo="${e.photoId}" alt=""></div>` : ''}
    <div class="body">
      <div class="top">
        <div style="flex:1;min-width:0">
          <div class="micro">01 Meal · ${fmtTime(e.ts)}</div>
          <div class="foods">${esc(e.foods) || '<span class="faint">no description</span>'}</div>
        </div>
        <div class="gauge">${gaugeSVG(e.hungerBefore, e.status === 'done' ? e.fullnessAfter : null)}
          <div class="nums">${e.hungerBefore ?? '–'} <b>→ ${e.status === 'done' ? (e.fullnessAfter ?? '–') : '…'}</b></div></div>
      </div>
      ${e.feelingNote ? `<div class="tiny" style="font-style:italic;margin-bottom:6px">“${esc(e.feelingNote)}”</div>` : ''}
      ${chips ? `<div>${chips}</div>` : ''}
      ${macroLine}
      ${held}
      ${e.status === 'open' ? `<button class="btn ghost olive sm finish" onclick="finishEntry('${e.id}')">Finish this entry</button>` : ''}
      <div style="margin-top:8px"><button class="link soft" onclick="editEntry('${e.id}')">Edit</button></div>
    </div>
  </div>`;
}

/* ---------- sheet ---------- */
let mealState = null;   // {mode:'before'|'all'|'after'|'edit', data}

function blankEntry(){
  return { id: uid(), ts: Date.now(), foods:'', photoId:null, hungerBefore:4, fullnessAfter:7,
    protein:false, satisfied:null, feelings:[], feelingNote:'', context:[], status:'open',
    overate:null, preceded:[], macros:null };
}
function openMealSheet(){
  const open = entries.find(e => e.status === 'open');
  mealState = { mode:null, data: blankEntry() };
  showSheet(`
    <h2>Log a meal</h2>
    <div class="sub">How do you want to tell it?</div>
    <button class="choice" onclick="startMeal('before')"><span class="glyph">🍽</span>
      <span><b>About to eat</b><span class="sub">Log the hunger now, come back after</span></span></button>
    <button class="choice" onclick="startMeal('all')"><span class="glyph">✿</span>
      <span><b>Already ate</b><span class="sub">Log the whole thing at once</span></span></button>
    ${open ? `<button class="choice" onclick="finishEntry('${open.id}')"><span class="glyph">✦</span>
      <span><b>Finish ${fmtTime(open.ts)}</b><span class="sub">${esc(open.foods) || 'no description'}</span></span></button>` : ''}
  `, null);
}
function startMeal(mode){ mealState.mode = mode; mealBefore(); }

function mealBefore(){
  const d = mealState.data, edit = mealState.mode === 'edit';
  showSheet(`
    <div class="step"><span class="micro">${edit ? 'Edit' : '01'} · Before</span>${edit ? `<button class="link soft" onclick="deleteEntry()">Delete</button>` : ''}</div>
    <h2>${edit ? 'Edit this meal' : 'What are you eating?'}</h2>
    <div class="sub">No portions, no numbers. Just words.</div>
    <div class="field"><textarea id="f-foods" placeholder="rice, beans, egg, salad…">${esc(d.foods)}</textarea>
      <button class="photo-btn" onclick="pickMealPhoto()">${ICON.camera} ${d.photoId ? 'Change photo' : 'Add a photo'}</button>
      <div id="photoPrev"></div></div>
    <div class="field"><label for="f-when">When</label><input type="datetime-local" id="f-when" value="${toLocalInput(d.ts)}"></div>
    <div class="field"><label>How hungry are you?</label>
      <input type="range" id="f-hunger" min="1" max="10" value="${d.hungerBefore ?? 4}" oninput="scaleRead('hunger')">
      <div class="scale-read"><span class="n" id="hunger-n">${d.hungerBefore ?? 4}</span><span class="w" id="hunger-w">${HUNGER_WORDS[d.hungerBefore ?? 4]}</span></div>
      <div class="hint">3–4 is a good place to start eating.</div></div>
    <div class="field"><label>Why now?</label><div class="chips" id="f-context">${chipsHTML(MEAL_CONTEXTS, d.context)}</div></div>
    <div class="foot">
      <button class="btn ghost" onclick="closeSheet()">Cancel</button>
      <button class="btn" onclick="saveBefore()">${mealState.mode === 'before' ? 'Save and eat' : 'Next'}</button>
    </div>`, null);
  renderMealPhotoPrev();
}
function mealAfter(){
  const d = mealState.data;
  const seg = (id, val, opts) => `<div class="seg" id="${id}">${opts.map(([k, l]) =>
    `<button type="button" data-k="${k}" class="${val === k ? 'on' : ''}" onclick="pickOne(this)">${l}</button>`).join('')}</div>`;
  showSheet(`
    <div class="step"><span class="micro">02 · After</span><button class="link soft" onclick="mealBefore()">Back</button></div>
    <h2>How did it land?</h2>
    <div class="sub">Curious, not critical.</div>
    <div class="field"><label>How full are you now?</label>
      <input type="range" id="f-full" min="1" max="10" value="${d.fullnessAfter ?? 7}" oninput="scaleRead('full')">
      <div class="scale-read"><span class="n" id="full-n">${d.fullnessAfter ?? 7}</span><span class="w" id="full-w">${HUNGER_WORDS[d.fullnessAfter ?? 7]}</span></div>
      <div class="zone-note">6–7 is the comfortable zone.</div></div>
    <div class="field"><label>Did you eat past full?</label>${seg('f-over', d.overate, [['no','stopped in time'],['bit','a bit past'],['yes','well past']])}</div>
    <div class="field"><label>What came before it?</label><div class="chips" id="f-preceded">${chipsHTML(MEAL_PRECEDED, d.preceded)}</div>
      <div class="hint">Only useful when you ate past full. Skip it otherwise.</div></div>
    <div class="field"><label>Was there protein?</label>${seg('f-protein', d.protein ? 'y' : (d.protein === false && d.status === 'done' ? 'n' : null), [['y','yes'],['n','no']])}
      <div class="hint">Just a note. Protein tends to hold you longer — something to add, never to swap out.</div></div>
    <div class="field"><label>Did it satisfy you?</label>${seg('f-sat', d.satisfied, [['yes','yes'],['partly','sort of'],['no','not really']])}</div>
    <div class="field"><label>How do you feel?</label><div class="chips" id="f-feel">${chipsHTML(MEAL_FEELINGS, d.feelings)}</div></div>
    ${settings.showMacros ? `<div class="field"><label>Numbers (optional)</label><div class="row2">
        <input type="number" id="m-kcal" inputmode="numeric" placeholder="kcal" value="${d.macros?.kcal ?? ''}">
        <input type="number" id="m-protein" inputmode="numeric" placeholder="protein g" value="${d.macros?.protein ?? ''}">
        <input type="number" id="m-carbs" inputmode="numeric" placeholder="carbs g" value="${d.macros?.carbs ?? ''}">
        <input type="number" id="m-fat" inputmode="numeric" placeholder="fat g" value="${d.macros?.fat ?? ''}"></div>
      <div class="hint">Leave blank whenever you'd rather not know.</div></div>` : ''}
    <div class="field"><label>Anything else?</label><textarea id="f-note" placeholder="optional">${esc(d.feelingNote)}</textarea></div>
    <div class="foot"><button class="btn" onclick="saveAfter()">Save</button></div>`, null);
}
function scaleRead(which){
  const v = +$(which === 'hunger' ? '#f-hunger' : '#f-full').value;
  $('#' + which + '-n').textContent = v;
  $('#' + which + '-w').textContent = HUNGER_WORDS[v];
}
const segValue = id => $(`${id} button.on`)?.dataset.k ?? null;

async function pickMealPhoto(){
  pickFile('fileIn', async files => {
    try {
      const id = await storePhoto(files[0], 'p', 600, .72);
      if (mealState.data.photoId) photoDel(mealState.data.photoId);
      mealState.data.photoId = id;
      renderMealPhotoPrev();
    } catch { toast("Couldn't read that photo."); }
  });
}
async function renderMealPhotoPrev(){
  const el = $('#photoPrev'); if (!el) return;
  const id = mealState.data.photoId;
  if (!id){ el.innerHTML = ''; return; }
  const u = await photoURL(id);
  el.innerHTML = u ? `<div class="photo-prev"><img src="${u}" alt=""><button onclick="removeMealPhoto()" aria-label="Remove photo">×</button></div>` : '';
}
function removeMealPhoto(){ photoDel(mealState.data.photoId); mealState.data.photoId = null; renderMealPhotoPrev(); }

function collectBefore(){
  const d = mealState.data;
  d.foods = $('#f-foods').value.trim();
  d.hungerBefore = +$('#f-hunger').value;
  d.context = selKeys('#f-context');
  const when = $('#f-when').value;
  if (when) d.ts = new Date(when).getTime();
}
function saveBefore(){
  collectBefore();
  if (mealState.mode === 'edit'){ mealAfter(); return; }
  if (mealState.mode === 'before'){
    mealState.data.status = 'open';
    upsert(entries, mealState.data); commit.entries();
    closeSheet(); rerender();
    toast('Enjoy it. Come back after and tell me how it went.');
  } else mealAfter();
}
function saveAfter(){
  const d = mealState.data;
  d.fullnessAfter = +$('#f-full').value;
  d.overate = segValue('#f-over');
  d.preceded = selKeys('#f-preceded');
  const p = segValue('#f-protein');
  d.protein = p === 'y';
  d.satisfied = segValue('#f-sat');
  d.feelings = selKeys('#f-feel');
  d.feelingNote = $('#f-note').value.trim();
  if (settings.showMacros){
    const num = id => { const v = $(id)?.value.trim(); return v === '' || v == null ? null : +v; };
    const m = { kcal:num('#m-kcal'), protein:num('#m-protein'), carbs:num('#m-carbs'), fat:num('#m-fat') };
    d.macros = Object.values(m).some(v => v != null) ? m : null;
  }
  d.status = 'done';
  upsert(entries, d); commit.entries();
  closeSheet(); rerender();
  toast(d.fullnessAfter <= 7 ? 'Logged. Listening to the body is the whole thing.' : 'Logged. Noticing without judging is already the practice.');
}
function finishEntry(id){
  const e = entries.find(x => x.id === id); if (!e) return;
  mealState = { mode:'after', data: { ...e } };
  mealAfter();
}
function editEntry(id){
  const e = entries.find(x => x.id === id); if (!e) return;
  mealState = { mode:'edit', data: { ...e } };
  mealBefore();
}
function deleteEntry(){
  if (!confirm('Delete this entry?')) return;
  const d = mealState.data;
  if (d.photoId) photoDel(d.photoId);
  entries = entries.filter(e => e.id !== d.id); commit.entries();
  closeSheet(); rerender();
  toast('Entry deleted.');
}
/* ---------- patterns ---------- */
function gaps(list){
  const all = entries.slice().sort(byTsAsc);
  const out = [];
  for (const e of list){
    const i = all.findIndex(x => x.id === e.id);
    const next = all[i + 1];
    if (next){ const g = next.ts - e.ts; if (g > 20*6e4 && g < 10*36e5) out.push(g); }
  }
  return out;
}
const barRow = (label, val, max, color, fmt) => `
  <div class="bar-row"><span class="bl">${esc(label)}</span>
    <div class="bar-track"><div class="bar-fill" style="width:${max ? Math.round(val/max*100) : 0}%;background:${color}"></div></div>
    <span class="bv">${esc(fmt)}</span></div>`;

function renderPatterns(){
  const done = doneEntries();
  if (done.length < 5) return `<div class="sec-title"><h2>Patterns</h2></div>
    <div class="card"><div class="empty"><div class="glyph">✧</div>Patterns show up after 5 finished meals.<br>${done.length} so far.</div></div>`;

  let out = '';
  /* protein vs holding time */
  const withP = gaps(done.filter(e => e.protein)), noP = gaps(done.filter(e => !e.protein));
  const aP = avg(withP), aN = avg(noP);
  if (aP != null && aN != null){
    const max = Math.max(aP, aN);
    out += `<div class="card pad"><div class="micro soft">How long meals held you</div>
      <div style="margin-top:8px">
        ${barRow('with protein', aP, max, 'var(--olive)', fmtDur(aP))}
        ${barRow('without', aN, max, 'var(--meal)', fmtDur(aN))}
      </div>
      <div class="p-note">${aP > aN ? `Meals with protein held you about ${fmtDur(aP - aN)} longer.` : 'No clear difference yet.'}</div></div>`;
  }
  /* eating past full by time of day */
  const buckets = [['morning', 5, 11], ['midday', 11, 15], ['afternoon', 15, 19], ['evening', 19, 24], ['night', 0, 5]];
  const over = done.filter(e => e.overate === 'yes' || e.overate === 'bit' || (e.overate == null && e.fullnessAfter >= 8));
  if (over.length){
    const counts = buckets.map(([label, a, b]) => [label, over.filter(e => { const h = new Date(e.ts).getHours(); return b > a ? (h >= a && h < b) : (h >= a || h < b); }).length]);
    const max = Math.max(...counts.map(c => c[1]));
    out += `<div class="card pad"><div class="micro soft">Eating past full · by time of day</div><div style="margin-top:8px">
      ${counts.map(([l, n]) => barRow(l, n, max, 'var(--ink)', String(n))).join('')}</div>
      <div class="p-note">${over.length} of ${done.length} meals went past comfortable. That is information, not a verdict.</div></div>`;
    /* what preceded */
    const prec = {};
    over.forEach(e => (e.preceded || []).forEach(p => prec[p] = (prec[p] || 0) + 1));
    const top = Object.entries(prec).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length){
      const max2 = top[0][1];
      out += `<div class="card pad"><div class="micro soft">What came before those meals</div><div style="margin-top:8px">
        ${top.map(([k, n]) => barRow(mealPrecLabel[k] || k, n, max2, 'var(--olive)', String(n))).join('')}</div>
        <div class="p-note">The most common one is usually the lever — not willpower at the table.</div></div>`;
    }
  }
  /* why you eat */
  const ctx = {};
  done.forEach(e => (e.context || []).forEach(c => ctx[c] = (ctx[c] || 0) + 1));
  const ctxTop = Object.entries(ctx).sort((a, b) => b[1] - a[1]);
  if (ctxTop.length){
    const max3 = ctxTop[0][1];
    out += `<div class="card pad"><div class="micro soft">Why you eat</div><div style="margin-top:8px">
      ${ctxTop.map(([k, n]) => barRow((mealCtxLabel[k] || k).replace(/^\S+\s/, ''), n, max3, 'var(--meal)', String(n))).join('')}</div></div>`;
  }
  /* satisfaction */
  const sat = done.filter(e => e.satisfied === 'yes').length;
  out += `<div class="card pad"><div class="stat-row">
      <div class="stat"><div class="n">${Math.round(sat/done.length*100)}%</div><div class="l">satisfied</div></div>
      <div class="stat"><div class="n">${Math.round(done.filter(e => e.fullnessAfter >= 6 && e.fullnessAfter <= 7).length/done.length*100)}%</div><div class="l">in the zone</div></div>
      <div class="stat"><div class="n">${done.length}</div><div class="l">meals</div></div>
    </div></div>`;

  return `<div class="sec-title"><h2>Patterns</h2><span class="tiny">${plural(done.length,'finished meal')}</span></div><div class="stack">${out}</div>`;
}
