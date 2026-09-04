/* ================= wins: milestones detected from the data, never typed ================= */
function detectWins(){
  const W = [];
  const add = (key, ts, title, sub, glyph) => W.push({ key, ts, title, sub: sub || '', glyph: glyph || '✦' });
  const t = settings.targets;
  const now = Date.now();

  /* firsts */
  const first = list => list.slice().sort(byTsAsc)[0];
  const fm = first(entries);   if (fm) add('first-meal', fm.ts, 'First meal logged', 'The diary begins.', '◐');
  const fu = first(urges);     if (fu) add('first-urge', fu.ts, 'First urge met with curiosity', 'Noticing is the whole practice.', '〰');
  const fs = first(sessions);  if (fs) add('first-strength', fs.ts, 'First strength session', '', '▮');
  const fp = first(progress);  if (fp) add('first-photo-progress', fp.ts, 'First progress photo', 'Future you will thank you.', '▣');

  /* runs */
  const runs = (runsCache.activities || []).slice().sort((a, b) => runTs(a) - runTs(b));
  let maxKm = 0;
  runs.forEach((r, i) => {
    const km = +r.distance_km || 0;
    if (i > 0 && km > maxKm) add('longest-run:' + r.activity_id, runTs(r), `Longest run yet · ${fmtKm(km)}`, r.name || '', '→');
    if (km > maxKm) maxKm = km;
  });

  /* weeks */
  const { start } = ymRange();
  const firstWeek = Math.min(weekStart(start.getTime()), ...runs.map(r => weekStart(runTs(r))), ...sessions.map(s => weekStart(s.ts)), ...entries.map(e => weekStart(e.ts)));
  const thisWeek = weekStart(now);
  let maxWeekKm = 0, weeksWithRuns = 0, firstTargetWeek = true;
  for (let ws = firstWeek; ws <= thisWeek; ws += 7*DAY){
    const st = weekStats(ws), complete = ws + 7*DAY <= now, endTs = Math.min(ws + 7*DAY - 1, now);
    if (st.runs >= t.runs && st.strength >= t.strength){
      add('week-target:' + dayKey(ws), endTs, firstTargetWeek ? 'First week hitting both targets' : 'Both targets hit',
          `${plural(st.runs,'run')} · ${plural(st.strength,'strength session')} · week of ${fmtShort(ws)}`, '◆');
      firstTargetWeek = false;
    }
    if (complete && st.runs){
      weeksWithRuns++;
      if (weeksWithRuns >= 2 && st.km > maxWeekKm) add('biggest-week:' + dayKey(ws), endTs, `Biggest running week · ${fmtKm(st.km)}`, `week of ${fmtShort(ws)}`, '↗');
      if (st.km > maxWeekKm) maxWeekKm = st.km;
    }
    const done = doneEntries().filter(e => weekStart(e.ts) === ws);
    if (complete && done.length >= 5){
      const zone = done.filter(e => e.fullnessAfter >= 6 && e.fullnessAfter <= 7).length;
      if (zone / done.length >= .6) add('zone-week:' + dayKey(ws), endTs, 'Most meals ended in the comfy zone', `${zone} of ${done.length} meals at 6–7 · week of ${fmtShort(ws)}`, '◎');
    }
  }

  /* urges */
  const us = urges.slice().sort(byTsAsc);
  let streak = 0;
  us.forEach((u, i) => {
    streak = u.outcome === 'acted' ? 0 : streak + 1;
    [3, 5, 10, 20].forEach(n => { if (streak === n) add(`urge-streak:${n}:${u.id}`, u.ts, `${n} urges surfed in a row`, 'Each one teaches the brain the wave passes.', '〰'); });
    [10, 25, 50, 100].forEach(n => { if (i + 1 === n) add('urges-total:' + n, u.ts, `${n} urges noticed`, 'Noticed, not obeyed.', '○'); });
  });

  /* logging streaks */
  const days = [...new Set(entries.map(e => dayKey(e.ts)))].sort();
  let runStart = null, prev = null, len = 0;
  const flush = () => { if (!runStart) return; [7, 14, 30, 60].forEach(n => { if (len >= n) add(`log-streak:${n}:${runStart}`, keyToDate(runStart).getTime() + (n-1)*DAY, `${n} days of logging`, `since ${fmtShort(keyToDate(runStart))}`, '▪'); }); };
  for (const k of days){
    if (prev && keyToDate(k) - keyToDate(prev) === DAY){ len++; }
    else { flush(); runStart = k; len = 1; }
    prev = k;
  }
  flush();

  /* day count */
  const dn = dayNumber(), { total } = ymRange();
  [...new Set([7, 30, 60, 100, total])].forEach(n => { if (dn >= n) add('day:' + n, start.getTime() + (n-1)*DAY, n === total ? 'You made it to the end' : `Day ${n} of Better`, n === total ? '31 December. Look back at the map.' : `${total - n} to go`, '●'); });

  return W.sort((a, b) => b.ts - a.ts);
}

function winsHTML(list, limit){
  const shown = limit ? list.slice(0, limit) : list;
  if (!shown.length) return `<div class="empty"><div class="glyph">✦</div>No wins yet. They appear on their own —<br>log a meal, a session, an urge.</div>`;
  return shown.map(w => `<div class="win"><div class="dot">${w.glyph}</div><div style="flex:1">
      <b>${esc(w.title)}${winsSeen[w.key] ? '' : '<span class="new">new</span>'}</b>
      <div class="sub">${esc(w.sub)}${w.sub ? ' · ' : ''}${fmtShort(w.ts)}</div></div></div>`).join('');
}
function markWinsSeen(list){
  let changed = false;
  list.forEach(w => { if (!winsSeen[w.key]){ winsSeen[w.key] = Date.now(); changed = true; } });
  if (changed) commit.winsSeen();
}
