/* ================= app ================= */
let view = 'home';
const RENDER = { home: renderHome, meals: renderMeals, train: renderTrain, urges: renderUrges, more: renderMore };

function go(v){
  view = v;
  $$('.view').forEach(el => el.classList.remove('on'));
  $$('.tab').forEach(el => el.classList.toggle('on', el.dataset.v === v));
  $('#view-' + v).classList.add('on');
  if (v !== 'more') morePage = null;
  RENDER[v]();
  window.scrollTo(0, 0);
  if (v === 'train') refreshRuns(false);
}
function rerender(){ RENDER[view](); }
function rerenderIf(views){ if (views.includes(view)) RENDER[view](); }

cleanupLegacy();
go('home');
refreshRuns(false);

window.addEventListener('online', () => refreshRuns(false));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && view !== 'urges') refreshRuns(false); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

/* dev seeding: open with ?dev=1 */
if (new URLSearchParams(location.search).has('dev')){
  const s = document.createElement('script'); s.src = 'dev/seed.js'; document.body.appendChild(s);
}
