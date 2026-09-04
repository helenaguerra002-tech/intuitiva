/* ================= util ================= */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAY = 864e5;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* dates — everything local */
const pad2 = n => String(n).padStart(2, '0');
const dayKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const keyToDate = k => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d, 12); };  // noon, DST-safe
const todayKey = () => dayKey(Date.now());
const fmtTime = ts => new Date(ts).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
const fmtDay = ts => new Date(ts).toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'});
const fmtDayLong = ts => new Date(ts).toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'});
const fmtShort = ts => new Date(ts).toLocaleDateString('en-GB', {day:'numeric', month:'short'});
const fmtDur = ms => { const h = Math.floor(ms/36e5), m = Math.round(ms%36e5/6e4); return h ? `${h}h${m ? pad2(m) : ''}` : `${m} min`; };
const fmtClock = ms => { const s = Math.ceil(ms/1000); return `${Math.floor(s/60)}:${pad2(s%60)}`; };
const weekStart = ts => { const d = new Date(ts); d.setHours(0,0,0,0); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return d.getTime(); };
const relDay = ts => { const k = dayKey(ts), t = todayKey(); if (k === t) return 'Today'; if (k === dayKey(Date.now()-DAY)) return 'Yesterday'; return fmtDay(ts); };
const toLocalInput = ts => { const d = new Date(ts); return new Date(ts - d.getTimezoneOffset()*6e4).toISOString().slice(0,16); };
const plural = (n, w, ws) => `${n} ${n === 1 ? w : (ws || w + 's')}`;
const avg = a => a.length ? a.reduce((s,x) => s+x, 0)/a.length : null;

/* toast */
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2600);
}

/* bottom sheet */
let sheetOnClose = null;
function showSheet(html, onClose){
  const s = $('#sheet');
  s.innerHTML = `<div class="grab"></div>${html}`;
  s.classList.add('on'); $('#sheetBg').classList.add('on');
  s.scrollTop = 0;
  if (onClose !== undefined) sheetOnClose = onClose;
}
function closeSheet(){
  $('#sheet').classList.remove('on'); $('#sheetBg').classList.remove('on');
  const cb = sheetOnClose; sheetOnClose = null;
  if (typeof cb === 'function') cb();
}
function togChip(el){ el.classList.toggle('sel'); }
function pickOne(el, cls){ el.parentElement.querySelectorAll('button').forEach(b => b.classList.remove(cls || 'on')); el.classList.add(cls || 'on'); }
const selKeys = sel => $$(sel + ' .sel').map(c => c.dataset.k);
const chipsHTML = (list, selected, cls) => list.map(([k, label]) =>
  `<button type="button" class="chip ${cls||''} ${(selected||[]).includes(k) ? 'sel' : ''}" data-k="${k}" onclick="togChip(this)">${label}</button>`).join('');

/* image compression → JPEG blob */
function compressImage(file, maxPx, quality){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      cv.toBlob(b => b ? resolve(b) : reject(new Error('encode')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('decode')); };
    img.src = URL.createObjectURL(file);
  });
}
function pickFile(inputId, cb){
  const inp = $('#' + inputId);
  inp.onchange = () => { const files = [...inp.files]; inp.value = ''; if (files.length) cb(files); };
  inp.click();
}

/* hunger → fullness arc (the Intuitiva signature, recoloured) */
function gaugeSVG(before, after, size){
  const w = size || 76, h = Math.round(w * 46/76);
  const a = v => Math.PI * (1 - (v-1)/9);
  const P = (v, r) => [40 + r*Math.cos(a(v)), 40 - r*Math.sin(a(v))];
  const pt = (v, r) => P(v, r).join(',');
  const arc = (v1, v2, r) => `M ${pt(v1,r)} A ${r} ${r} 0 0 1 ${pt(v2,r)}`;
  let g = `<svg width="${w}" height="${h}" viewBox="0 0 80 46" aria-hidden="true">
    <path d="${arc(1,10,30)}" stroke="#ede8df" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="${arc(6,7,30)}" stroke="#cdd9b8" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  if (before != null && after != null && after > before)
    g += `<path d="${arc(before,after,30)}" stroke="#5c7a3e" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".9"/>`;
  if (before != null){ const [x,y] = P(before,30); g += `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="#1a1a1a" stroke-width="2"/>`; }
  if (after != null){ const [x,y] = P(after,30); g += `<circle cx="${x}" cy="${y}" r="4.5" fill="#5c7a3e"/>`; }
  return g + '</svg>';
}

const HUNGER_WORDS = {1:'starving — weak, even dizzy', 2:'very hungry, irritable', 3:'hungry, stomach growling', 4:'starting to feel hungry',
  5:'neutral — not hungry, not full', 6:'comfortably satisfied', 7:'satisfied, slightly full', 8:'full, a bit uncomfortable', 9:'very full, heavy', 10:'stuffed'};
const RPE_WORDS = {1:'barely moved', 2:'very light', 3:'light', 4:'easy effort', 5:'moderate', 6:'working', 7:'hard', 8:'very hard', 9:'near max', 10:'all out'};

/* small stroke icons */
const ICON = {
  run: '<svg viewBox="0 0 24 24"><circle cx="14" cy="4.5" r="1.6"/><path d="M6 20l4-6 3 2 3-5-3-2-3 3-3-1"/><path d="M13 16l3 4"/></svg>',
  str: '<svg viewBox="0 0 24 24"><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/></svg>',
  meal: '<svg viewBox="0 0 24 24"><path d="M4 12h16a8 8 0 0 1-16 0Z"/><path d="M8 12V6M12 12V5M16 12V7"/></svg>',
  urge: '<svg viewBox="0 0 24 24"><path d="M2 15c3-5 6-5 9 0s6 5 9 0"/><path d="M2 9c3-5 6-5 9 0s6 5 9 0" opacity=".5"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.8 6.5 19.7l1.2-6.1L3.2 9.4l6.1-.8z"/></svg>',
};
