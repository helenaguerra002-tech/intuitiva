/* ================= HOME ================= */
function renderHome(){
  const el = $('#view-home');
  const dn = dayNumber(), { total } = ymRange(), left = daysLeft();
  const hero = settings.heroId;
  const ws = weekStart(Date.now()), st = weekStats(ws), t = settings.targets;
  const wins = detectWins();

  const pills = (n, target, ink) => {
    let h = '';
    for (let i = 0; i < Math.max(target, n); i++) h += `<span class="pill ${ink ? 'ink' : ''} ${i < n ? (i < target ? 'on' : 'on extra') : ''}"></span>`;
    return `<div class="pills">${h}</div>`;
  };

  el.innerHTML = `
    <div class="hero">
      ${hero ? `<img data-photo="${hero}" alt="" class="photo-wrap">` : ''}
      <div class="scrim"></div>
      ${hero ? '' : `<button class="pick" onclick="openMore('inspo')">Pick a hero photo</button>`}
      <div class="text">
        <div class="eyebrow">Better · until 31 December</div>
        <div class="day">Day ${dn}<small>of ${total}</small></div>
        <div class="date">${fmtDayLong(Date.now())} · ${left === 0 ? 'last day' : plural(left, 'day') + ' to go'}</div>
      </div>
    </div>
    <div class="wrap stack">
      ${backupDue() ? `<div class="banner"><span>Over a week without a backup. Everything lives only on this phone.</span><button onclick="exportBackup()">Export</button></div>` : ''}
      <div class="quick">
        <button onclick="openMealSheet()">${ICON.meal}Log meal</button>
        <button onclick="openTrainQuick()">${ICON.str}Log training</button>
        <button onclick="startSurf()">${ICON.urge}Surf an urge</button>
      </div>
      <div class="card pad">
        <div class="micro soft" style="margin-bottom:6px">This week · from ${fmtShort(ws)}</div>
        <div class="week-row"><span class="lab">Runs</span>${pills(st.runs, t.runs)}<span class="val">${st.runs}/${t.runs}${st.km ? ' · ' + fmtKm(st.km) : ''}</span></div>
        <div class="week-row"><span class="lab">Strength</span>${pills(st.strength, t.strength, true)}<span class="val">${st.strength}/${t.strength}</span></div>
        <div class="divider" style="margin:6px 0 10px"></div>
        <div class="stat-row">
          <div class="stat"><div class="n">${st.meals}</div><div class="l">meals</div></div>
          <div class="stat"><div class="n">${st.urges}</div><div class="l">urges noticed</div></div>
          <div class="stat"><div class="n">${Object.keys(dayMarks()).filter(k => k >= settings.startDate).length}</div><div class="l">days marked</div></div>
        </div>
        ${runsState !== 'ok' && runsState !== 'idle' ? `<div class="tiny" style="margin-top:8px">${esc(runsStatusLine())}</div>` : ''}
      </div>
      <div>
        <div class="sec-title"><h2>Your days</h2><button class="link" onclick="openMore('progress')">Full map</button></div>
        <div class="card pad">${renderYearMap(true)}
          <div class="legend"><span><i class="run"></i>run</span><span><i class="str"></i>strength</span><span><i class="meal"></i>meal</span><span><i class="urge"></i>urge surfed</span></div></div>
      </div>
      <div>
        <div class="sec-title"><h2>Wins</h2>${wins.length > 3 ? `<button class="link" onclick="openMore('progress')">All ${wins.length}</button>` : ''}</div>
        <div class="card pad" style="padding-top:2px;padding-bottom:2px">${winsHTML(wins, 3)}</div>
      </div>
    </div>`;
  hydratePhotos(el);
  requestAnimationFrame(() => markWinsSeen(wins.slice(0, 3)));
}
function openTrainQuick(){ openStrengthSheet(); }
