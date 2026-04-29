// date default
  (function() {
    const d = new Date(), p = n => String(n).padStart(2,'0');
    document.getElementById('entryDate').value =
      `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  })();

  // switchTab — defined below with full tab support

  // toast
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }

  // save
  function saveEntry() {
    const date    = document.getElementById('entryDate').value;
    if (!date) { showToast('Pick a date first.'); return; }
    const entries = JSON.parse(localStorage.getItem('eamt_entries') || '{}');
    entries[date] = {
      date,
      mood:    document.getElementById('moodWord').value,
      moodInt: document.getElementById('moodSlider').value,
      energy:  document.getElementById('energySlider').value,
      anxiety: document.getElementById('anxietySlider').value,
      sleepH:  document.getElementById('sleepHours').value,
      sleepQ:  document.getElementById('sleepQuality').value,
      win:     document.getElementById('winYesterday').value.trim(),
      intent:  document.getElementById('intentionToday').value.trim(),
      notes:   document.getElementById('notes').value.trim(),
      savedAt: Date.now()
    };
    localStorage.setItem('eamt_entries', JSON.stringify(entries));
    showToast('Entry saved. ✦');
    renderEntries();
  }

  // render list
  function renderEntries() {
    const entries = JSON.parse(localStorage.getItem('eamt_entries') || '{}');
    const keys    = Object.keys(entries).sort((a,b) => b.localeCompare(a));
    document.getElementById('daysCount').textContent = `Days with you: ${keys.length}`;
    const list = document.getElementById('entryList');
    if (!keys.length) {
      list.innerHTML = `<div class="empty-state">Nothing here yet. Your first entry is waiting whenever you're ready.</div>`;
      return;
    }
    list.innerHTML = keys.map(k => {
      const e = entries[k];
      const display = new Date(k + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      return `<div class="entry-item" onclick="loadEntry('${k}')">
        <span class="entry-date">${display}</span>
        <span class="entry-mood">${e.mood || '—'}</span>
        <span class="entry-scores">
          <span>Mood ${e.moodInt}/10</span>
          <span>Energy ${e.energy}/10</span>
          <span>Anxiety ${e.anxiety}/10</span>
        </span>
      </div>`;
    }).join('');
  }

  // load entry
  function loadEntry(date) {
    const e = (JSON.parse(localStorage.getItem('eamt_entries') || '{}'))[date];
    if (!e) return;
    document.getElementById('entryDate').value      = e.date;
    document.getElementById('moodWord').value       = e.mood    || '';
    document.getElementById('moodSlider').value     = e.moodInt || 5;
    document.getElementById('energySlider').value   = e.energy  || 5;
    document.getElementById('anxietySlider').value  = e.anxiety || 5;
    document.getElementById('sleepHours').value     = e.sleepH  || '';
    document.getElementById('sleepQuality').value   = e.sleepQ  || '';
    document.getElementById('winYesterday').value   = e.win     || '';
    document.getElementById('intentionToday').value = e.intent  || '';
    document.getElementById('notes').value          = e.notes   || '';
    document.getElementById('moodVal').innerHTML    = (e.moodInt||5)+'<span>/10</span>';
    document.getElementById('energyVal').innerHTML  = (e.energy||5) +'<span>/10</span>';
    document.getElementById('anxietyVal').innerHTML = (e.anxiety||5)+'<span>/10</span>';
    window.scrollTo({top:0, behavior:'smooth'});
  }

  // export/import — defined below with full data support

  renderEntries();

  // ── CHART RANGE ──
  let chartRange = 7;
  function setChartRange(days, btn) {
    chartRange = days;
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCharts();
  }

  // ── CHART ENGINE ──
  function getEntries(days) {
    const all = JSON.parse(localStorage.getItem('eamt_entries') || '{}');
    const keys = Object.keys(all).sort();
    if (days === 0) return keys.map(k => all[k]);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return keys.filter(k => new Date(k + 'T12:00:00') >= cutoff).map(k => all[k]);
  }

  function renderLineChart(svgId, entries, field, color, w, h) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    const pad = { top: 24, right: 20, bottom: 28, left: 32 };
    const iw = w - pad.left - pad.right;
    const ih = h - pad.top - pad.bottom;

    if (!entries.length) {
      svg.innerHTML = `<text x="${w/2}" y="${h/2}" text-anchor="middle" fill="rgba(245,240,232,0.25)" font-family="Cormorant Garamond, serif" font-style="italic" font-size="14">Not enough data yet — keep logging.</text>`;
      return;
    }

    const vals = entries.map(e => parseFloat(e[field]) || 0);
    const minV = 0, maxV = 10;
    const xStep = entries.length > 1 ? iw / (entries.length - 1) : iw;

    const toX = i => pad.left + (entries.length > 1 ? i * xStep : iw / 2);
    const toY = v => pad.top + ih - ((v - minV) / (maxV - minV)) * ih;

    // grid lines
    let grid = '';
    [2,4,6,8,10].forEach(v => {
      const y = toY(v);
      grid += `<line x1="${pad.left}" y1="${y}" x2="${pad.left + iw}" y2="${y}" stroke="rgba(201,168,76,0.08)" stroke-width="1"/>`;
      grid += `<text x="${pad.left - 5}" y="${y + 4}" text-anchor="end" fill="rgba(245,240,232,0.3)" font-family="DM Sans,sans-serif" font-size="9">${v}</text>`;
    });

    // area fill
    let area = `M ${toX(0)} ${toY(vals[0])}`;
    for (let i = 1; i < vals.length; i++) {
      const x0 = toX(i-1), y0 = toY(vals[i-1]);
      const x1 = toX(i),   y1 = toY(vals[i]);
      const cpx = (x0 + x1) / 2;
      area += ` C ${cpx} ${y0} ${cpx} ${y1} ${x1} ${y1}`;
    }
    const areaFill = area + ` L ${toX(vals.length-1)} ${pad.top+ih} L ${toX(0)} ${pad.top+ih} Z`;

    // line path
    let line = `M ${toX(0)} ${toY(vals[0])}`;
    for (let i = 1; i < vals.length; i++) {
      const x0 = toX(i-1), y0 = toY(vals[i-1]);
      const x1 = toX(i),   y1 = toY(vals[i]);
      const cpx = (x0 + x1) / 2;
      line += ` C ${cpx} ${y0} ${cpx} ${y1} ${x1} ${y1}`;
    }

    // dots + hit targets
    let dots = '', hits = '';
    vals.forEach((v, i) => {
      const x = toX(i), y = toY(v);
      const d = entries[i].date;
      const display = new Date(d + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
      dots += `<circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="rgba(15,20,18,0.8)" stroke-width="1.5"/>`;
      hits += `<circle cx="${x}" cy="${y}" r="12" fill="transparent" class="chart-dot"
        data-tip="${display}: ${v}/10" onmouseenter="showTip(event,'${svgId}')" onmouseleave="hideTip('${svgId}')"/>`;
    });

    // x axis labels — show only a few
    let labels = '';
    const step = Math.ceil(entries.length / 6);
    entries.forEach((e, i) => {
      if (i % step !== 0 && i !== entries.length - 1) return;
      const display = new Date(e.date + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
      labels += `<text x="${toX(i)}" y="${pad.top+ih+16}" text-anchor="middle" fill="rgba(245,240,232,0.3)" font-family="DM Sans,sans-serif" font-size="9">${display}</text>`;
    });

    const gradId = `grad_${svgId}`;
    svg.innerHTML = `
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      ${grid}
      <path d="${areaFill}" fill="url(#${gradId})"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
      ${dots}${hits}${labels}`;
  }

  function showTip(e, svgId) {
    const tip = document.getElementById(svgId.replace('Chart','Tooltip')) || document.getElementById('moodTooltip');
    if (!tip) return;
    tip.textContent = e.target.dataset.tip;
    tip.classList.add('visible');
    tip.style.left = (e.offsetX + 12) + 'px';
    tip.style.top  = (e.offsetY - 28) + 'px';
  }
  function hideTip(svgId) {
    const tip = document.getElementById(svgId.replace('Chart','Tooltip')) || document.getElementById('moodTooltip');
    if (tip) tip.classList.remove('visible');
  }

  function renderCharts() {
    const entries = getEntries(chartRange);
    renderLineChart('moodChart',    entries, 'moodInt', '#c9a84c', 800, 200);
    renderLineChart('energyChart',  entries, 'energy',  '#7a9e7e', 800, 160);
    renderLineChart('anxietyChart', entries, 'anxiety', '#c084d4', 800, 160);
    renderLineChart('sleepChart',   entries, 'sleepH',  '#82c4e8', 800, 160);
    renderPatternStats(entries);
  }

  function renderPatternStats(entries) {
    const all = JSON.parse(localStorage.getItem('eamt_entries') || '{}');
    document.getElementById('statDays').textContent = Object.keys(all).length;
    if (!entries.length) return;
    const avgMood = (entries.reduce((s,e) => s + (parseFloat(e.moodInt)||0), 0) / entries.length).toFixed(1);
    const sleepEntries = entries.filter(e => parseFloat(e.sleepH) > 0);
    const avgSleep = sleepEntries.length
      ? (sleepEntries.reduce((s,e) => s + parseFloat(e.sleepH), 0) / sleepEntries.length).toFixed(1)
      : '—';
    document.getElementById('statAvgMood').textContent  = avgMood;
    document.getElementById('statAvgSleep').textContent = avgSleep;

    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const byDay = Array(7).fill(null).map(() => []);
    Object.values(all).forEach(e => {
      const d = new Date(e.date + 'T12:00:00').getDay();
      if (parseFloat(e.moodInt)) byDay[d].push(parseFloat(e.moodInt));
    });
    const avgs = byDay.map(arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : -1);
    const best = avgs.indexOf(Math.max(...avgs));
    document.getElementById('statBestDay').textContent = avgs[best] >= 0 ? days[best] : '—';
  }

  // ── TRIGGERS ──
  function saveTrigger() {
    const date = document.getElementById('tDate').value;
    const what = document.getElementById('tWhat').value.trim();
    if (!date || !what) { showToast('Date and description are required.'); return; }
    const triggers = JSON.parse(localStorage.getItem('eamt_triggers') || '[]');
    triggers.unshift({
      id: Date.now(),
      date,
      type:     document.getElementById('tType').value,
      what,
      severity: document.getElementById('tSeverity').value,
      duration: document.getElementById('tDuration').value.trim(),
      ptsd:     document.getElementById('tPTSD').checked,
      adhd:     document.getElementById('tADHD').checked,
      anxiety:  document.getElementById('tAnxiety').checked,
      helped:   document.getElementById('tHelped').value.trim(),
    });
    localStorage.setItem('eamt_triggers', JSON.stringify(triggers));
    showToast('Trigger logged. ✦');
    ['tDate','tType','tWhat','tDuration','tHelped'].forEach(id => document.getElementById(id).value = '');
    ['tPTSD','tADHD','tAnxiety'].forEach(id => document.getElementById(id).checked = false);
    document.getElementById('tSeverity').value = 5;
    document.getElementById('tSevVal').innerHTML = '5<span>/10</span>';
    renderTriggers();
  }

  function renderTriggers() {
    const triggers = JSON.parse(localStorage.getItem('eamt_triggers') || '[]');
    document.getElementById('triggerCount').textContent = triggers.length + ' logged';
    const list = document.getElementById('triggerList');
    if (!triggers.length) {
      list.innerHTML = '<div class="empty-state">No triggers logged yet. Naming them is the first step.</div>';
      return;
    }
    list.innerHTML = triggers.map(t => {
      const display = new Date(t.date + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      const tags = [
        t.ptsd    ? '<span class="tag ptsd">PTSD flare</span>'    : '',
        t.adhd    ? '<span class="tag adhd">ADHD disruption</span>': '',
        t.anxiety ? '<span class="tag spike">Anxiety spike</span>' : '',
        t.type    ? `<span class="tag">${t.type}</span>`           : '',
      ].filter(Boolean).join('');
      return `<div class="trigger-item">
        <div class="trigger-header">
          <span class="trigger-type">${t.type || 'Unspecified'}</span>
          <span class="trigger-date">${display} · Severity ${t.severity}/10${t.duration ? ' · ' + t.duration : ''}</span>
        </div>
        <div class="trigger-what">${t.what}</div>
        ${tags ? '<div class="trigger-tags">' + tags + '</div>' : ''}
        ${t.helped ? '<div style="font-size:0.8rem;color:var(--sage);margin-top:0.4rem">Helped: ' + t.helped + '</div>' : ''}
      </div>`;
    }).join('');
  }

  // ── MEDICATIONS ──
  let waterToday = 0;
  function adjustWater(delta) {
    waterToday = Math.max(0, waterToday + delta);
    document.getElementById('waterCount').textContent = waterToday;
  }

  function saveMed() {
    const name = document.getElementById('mName').value.trim();
    const date = document.getElementById('mDate').value;
    if (!name || !date) { showToast('Name and date are required.'); return; }
    const times = ['mMorn','mAftn','mEvng','mNght'].filter(id => document.getElementById(id).checked)
      .map(id => ({mMorn:'Morning',mAftn:'Afternoon',mEvng:'Evening',mNght:'Night'}[id]));
    const meds = JSON.parse(localStorage.getItem('eamt_meds') || '[]');
    meds.unshift({
      id: Date.now(), date, name,
      dosage: document.getElementById('mDosage').value.trim(),
      times, note: document.getElementById('mNote').value.trim(),
    });
    localStorage.setItem('eamt_meds', JSON.stringify(meds));
    showToast('Medication logged. ✦');
    ['mName','mDosage','mNote'].forEach(id => document.getElementById(id).value = '');
    ['mMorn','mAftn','mEvng','mNght'].forEach(id => document.getElementById(id).checked = false);
    renderMeds();
  }

  function saveWellness() {
    const wellness = JSON.parse(localStorage.getItem('eamt_wellness') || '{}');
    const d = new Date(), p = n => String(n).padStart(2,'0');
    const today = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
    wellness[today] = {
      water:      waterToday,
      movement:   document.getElementById('wMovement').checked,
      air:        document.getElementById('wAir').checked,
      connection: document.getElementById('wConnection').checked,
    };
    localStorage.setItem('eamt_wellness', JSON.stringify(wellness));
    showToast('Wellness check-in saved. ✦');
  }

  function renderMeds() {
    const meds = JSON.parse(localStorage.getItem('eamt_meds') || '[]');
    document.getElementById('medCount').textContent = meds.length + ' entries';
    const list = document.getElementById('medList');
    if (!meds.length) {
      list.innerHTML = '<div class="empty-state">Nothing logged yet. Your data stays here and only here.</div>';
      return;
    }
    list.innerHTML = meds.map(m => {
      const display = new Date(m.date + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      const pills = m.times.map(t => `<span class="time-pill">${t}</span>`).join('');
      return `<div class="med-item">
        <div class="med-header-row">
          <span class="med-name">${m.name}</span>
          <span class="med-date">${display}</span>
        </div>
        ${m.dosage ? '<div class="med-dosage">' + m.dosage + '</div>' : ''}
        ${pills ? '<div class="med-times">' + pills + '</div>' : ''}
        ${m.note ? '<div style="font-size:0.82rem;color:var(--text-muted);margin-top:0.4rem;font-style:italic">' + m.note + '</div>' : ''}
      </div>`;
    }).join('');
  }

  // ── WINS ──
  function saveWin() {
    const win = document.getElementById('wWin').value.trim();
    const date = document.getElementById('wDate').value;
    if (!win) { showToast('Tell me the win first.'); return; }
    const wins = JSON.parse(localStorage.getItem('eamt_wins') || '[]');
    wins.unshift({
      id: Date.now(), date: date || new Date().toISOString().split('T')[0],
      win, category: document.getElementById('wCategory').value,
    });
    localStorage.setItem('eamt_wins', JSON.stringify(wins));
    showToast('Win logged. ✦');
    document.getElementById('wWin').value = '';
    document.getElementById('wCategory').value = '';
    renderWins();
  }

  function remindMe() {
    const wins = JSON.parse(localStorage.getItem('eamt_wins') || '[]');
    if (!wins.length) { showToast('Log some wins first — then ask for a reminder.'); return; }
    const w = wins[Math.floor(Math.random() * wins.length)];
    const rem = document.getElementById('winReminder');
    document.getElementById('reminderText').textContent = w.win;
    rem.style.display = 'block';
    rem.classList.add('fade-in');
    setTimeout(() => rem.style.display = 'none', 6000);
  }

  function renderWins() {
    const wins = JSON.parse(localStorage.getItem('eamt_wins') || '[]');
    document.getElementById('winsCount').textContent = wins.length + ' wins';
    const list = document.getElementById('winList');
    if (!wins.length) {
      list.innerHTML = '<div class="empty-state">Every win you log here is evidence against the hard days.</div>';
      return;
    }
    list.innerHTML = wins.map(w => {
      const display = new Date(w.date + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      return `<div class="win-item">
        <div class="win-text">${w.win}</div>
        <div class="win-meta">
          <span class="win-category">${w.category || 'Uncategorized'}</span>
          <span>${display}</span>
        </div>
      </div>`;
    }).join('');
  }

  // ── CRISIS ──
  function autosaveCrisis() {
    const crisis = {
      grounding:  document.getElementById('cGrounding')?.value  || '',
      whatWorks:  document.getElementById('cWhatWorks')?.value  || '',
    };
    localStorage.setItem('eamt_crisis', JSON.stringify(crisis));
  }

  function saveContact() {
    const name  = document.getElementById('cName').value.trim();
    const phone = document.getElementById('cPhone').value.trim();
    if (!name) { showToast('At least a name.'); return; }
    const contacts = JSON.parse(localStorage.getItem('eamt_contacts') || '[]');
    contacts.push({
      id: Date.now(), name, phone,
      rel: document.getElementById('cRel').value.trim(),
    });
    localStorage.setItem('eamt_contacts', JSON.stringify(contacts));
    ['cName','cRel','cPhone'].forEach(id => document.getElementById(id).value = '');
    showToast('Contact saved. ✦');
    renderContacts();
  }

  function deleteContact(id) {
    const contacts = JSON.parse(localStorage.getItem('eamt_contacts') || '[]').filter(c => c.id !== id);
    localStorage.setItem('eamt_contacts', JSON.stringify(contacts));
    renderContacts();
  }

  function renderContacts() {
    const contacts = JSON.parse(localStorage.getItem('eamt_contacts') || '[]');
    const list = document.getElementById('contactList');
    if (!list) return;
    if (!contacts.length) {
      list.innerHTML = '<p style="font-family:'DM Sans',sans-serif;font-size:0.88rem;color:var(--text-muted);margin-bottom:0.8rem;font-style:italic">No contacts yet. Add the people who help you through it.</p>';
      return;
    }
    list.innerHTML = contacts.map(c => `
      <div class="contact-item">
        <div>
          <div style="font-family:'DM Sans',sans-serif;font-size:0.92rem;font-weight:600;color:var(--cream)">${c.name}</div>
          <div style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text-muted)">${c.rel || ''}</div>
        </div>
        <div style="font-family:'DM Sans',sans-serif;font-size:0.88rem;color:var(--sage)">${c.phone || ''}</div>
        <button class="delete-btn" onclick="deleteContact(${c.id})">✕</button>
      </div>`).join('');
  }

  function loadCrisisData() {
    const crisis = JSON.parse(localStorage.getItem('eamt_crisis') || '{}');
    if (document.getElementById('cGrounding')) document.getElementById('cGrounding').value = crisis.grounding || '';
    if (document.getElementById('cWhatWorks')) document.getElementById('cWhatWorks').value = crisis.whatWorks || '';
    renderContacts();
  }

  // ── EXPORT (updated to include all data) ──
  function exportData() {
    const data = {
      entries:   JSON.parse(localStorage.getItem('eamt_entries')  || '{}'),
      triggers:  JSON.parse(localStorage.getItem('eamt_triggers') || '[]'),
      meds:      JSON.parse(localStorage.getItem('eamt_meds')     || '[]'),
      wellness:  JSON.parse(localStorage.getItem('eamt_wellness') || '{}'),
      wins:      JSON.parse(localStorage.getItem('eamt_wins')     || '[]'),
      contacts:  JSON.parse(localStorage.getItem('eamt_contacts') || '[]'),
      crisis:    JSON.parse(localStorage.getItem('eamt_crisis')   || '{}'),
      exportedAt: new Date().toISOString()
    };
    const a = document.createElement('a');
    const d = new Date(), p = n => String(n).padStart(2,'0');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download = `ever-after-mood-tracker-backup-${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Full backup exported. ✦');
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!confirm('This will replace your current data. Continue?')) return;
        if (data.entries)  localStorage.setItem('eamt_entries',  JSON.stringify(data.entries));
        if (data.triggers) localStorage.setItem('eamt_triggers', JSON.stringify(data.triggers));
        if (data.meds)     localStorage.setItem('eamt_meds',     JSON.stringify(data.meds));
        if (data.wellness) localStorage.setItem('eamt_wellness', JSON.stringify(data.wellness));
        if (data.wins)     localStorage.setItem('eamt_wins',     JSON.stringify(data.wins));
        if (data.contacts) localStorage.setItem('eamt_contacts', JSON.stringify(data.contacts));
        if (data.crisis)   localStorage.setItem('eamt_crisis',   JSON.stringify(data.crisis));
        renderEntries(); renderTriggers(); renderMeds(); renderWins(); loadCrisisData();
        showToast('Data restored. Welcome back. ✦');
      } catch { showToast("That file didn't work. Try again."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── TAB SWITCH (updated to trigger renders) ──
  function switchTab(name, btn) {
    document.querySelectorAll('[id^="tab-"]').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById('tab-' + name);
    panel.style.display = 'block';
    panel.classList.remove('fade-in');
    void panel.offsetWidth;
    panel.classList.add('fade-in');
    btn.classList.add('active');
    if (name === 'patterns')   renderCharts();
    if (name === 'triggers')   renderTriggers();
    if (name === 'medications') renderMeds();
    if (name === 'wins')       renderWins();
    if (name === 'crisis')     loadCrisisData();
  }

  // ── DATE DEFAULTS FOR NEW TABS ──
  (function initDates() {
    const d = new Date(), p = n => String(n).padStart(2,'0');
    const today = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
    ['tDate','mDate','wDate'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = today;
    });
  })();

  renderTriggers();
  renderMeds();
  renderWins();