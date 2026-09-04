/* ================= year map: one cell per day until 31 Dec ================= */
function ymRange(){
  const start = keyToDate(settings.startDate), end = keyToDate(settings.endDate);
  const total = Math.max(1, Math.round((end - start) / DAY) + 1);
  return { start, end, total };
}
function dayNumber(){
  const { start, total } = ymRange();
  return clamp(Math.floor((keyToDate(todayKey()) - start) / DAY) + 1, 1, total);
}
function daysLeft(){
  const { end } = ymRange();
  return Math.max(0, Math.round((end - keyToDate(todayKey())) / DAY));
}

function dayMarks(){
  const m = {};
  const at = (k, f) => { (m[k] ||= { meal:0, run:0, strength:0, urge:0 })[f]++; };
  entries.forEach(e => at(dayKey(e.ts), 'meal'));
  sessions.forEach(s => at(dayKey(s.ts), 'strength'));
  urges.forEach(u => at(dayKey(u.ts), 'urge'));
  (runsCache.activities || []).forEach(r => at(runDay(r), 'run'));
  return m;
}

function renderYearMap(compact){
  const { start, end } = ymRange();
  const marks = dayMarks(), today = todayKey();
  const d = new Date(start); d.setDate(d.getDate() - ((d.getDay()+6)%7));     // back to Monday
  const last = new Date(end); last.setDate(last.getDate() + (7 - ((last.getDay()+6)%7) - 1)); // forward to Sunday
  let cells = '';
  const rows = [];
  let row = [];
  for (; d <= last; d.setDate(d.getDate() + 1)){
    const k = dayKey(d), inRange = d >= start && d <= end;
    if (d.getDay() === 1){ if (row.length) rows.push(row); row = []; }
    row.push({ k, inRange, date: new Date(d) });
  }
  if (row.length) rows.push(row);
  let lastLabelMonth = -1;
  for (const r of rows){
    const inR = r.filter(c => c.inRange);
    // label a row with the month that begins in it; the first row is labelled whatever month it starts in
    let label = '';
    if (inR.length){
      const marker = inR.find(c => c.date.getDate() === 1) || (lastLabelMonth === -1 ? inR[0] : null);
      if (marker && marker.date.getMonth() !== lastLabelMonth){
        label = marker.date.toLocaleDateString('en-GB', { month: 'short' });
        lastLabelMonth = marker.date.getMonth();
      }
    }
    cells += `<div class="ym-month">${label}</div>`;
    for (const c of r){
      if (!c.inRange){ cells += '<div class="ym-cell blank"></div>'; continue; }
      const mk = marks[c.k] || {};
      const any = mk.run || mk.strength || mk.meal || mk.urge;
      const cls = ['ym-cell', any ? 'any' : '', c.k === today ? 'today' : '', c.k > today ? 'future' : ''].join(' ');
      const title = `${fmtDay(c.date)}${any ? ': ' + [mk.run && plural(mk.run,'run'), mk.strength && plural(mk.strength,'session'), mk.meal && plural(mk.meal,'meal'), mk.urge && plural(mk.urge,'urge')].filter(Boolean).join(', ') : ''}`;
      cells += `<div class="${cls}" title="${esc(title)}" aria-label="${esc(title)}">
        <i class="run ${mk.run ? 'on' : ''}"></i><i class="str ${mk.strength ? 'on' : ''}"></i>
        <i class="meal ${mk.meal ? 'on' : ''}"></i><i class="urge ${mk.urge ? 'on' : ''}"></i></div>`;
    }
  }
  const legend = `<div class="legend"><span><i class="run"></i>run</span><span><i class="str"></i>strength</span><span><i class="meal"></i>meal logged</span><span><i class="urge"></i>urge surfed</span></div>`;
  return `<div class="ymap ${compact ? 'compact' : ''}" role="img" aria-label="Calendar of logged days">${cells}</div>${compact ? '' : legend}`;
}
