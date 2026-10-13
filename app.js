// ===== STATE & DATA =====
const STORAGE_KEY = 'habitos_gadzhi_v2';

const defaultAreas = [
  { id: 'finanzas', title: 'Finanzas', icon: '💰', color: '#f1c40f' },
  { id: 'salud', title: 'Salud & Vitalidad', icon: '⚡', color: '#2ecc71' },
  { id: 'superacion', title: 'Mente', icon: '🧠', color: '#9b59b6' },
  { id: 'relaciones', title: 'Relaciones', icon: '❤️', color: '#e84393' },
  { id: 'trabajo', title: 'Trabajo', icon: '🧱', color: '#3498db' }
];

let state = {
  habits: [],
  events: [],
  weeklyHabits: [
    { id: 'wh1', name: '1. [Escribe tu hábito aquí]', area: 'salud', daysTarget: 1, checks: [false] },
    { id: 'wh2', name: '2. [Escribe tu hábito aquí]', area: 'superacion', daysTarget: 3, checks: [false, false, false] },
    { id: 'wh3', name: '3. [Escribe tu hábito aquí]', area: 'finanzas', daysTarget: 2, checks: [false, false] },
    { id: 'wh4', name: '4. [Escribe tu hábito aquí]', area: 'trabajo', daysTarget: 6, checks: [false, false, false, false, false, false] }
  ],
  annualGoals: {
    finanzas: [], salud: [], superacion: [], relaciones: [], trabajo: []
  },
  lifeAreas: {
    finanzas: { objectives: [], daily: [], weekly: [], monthly: [] },
    salud: { objectives: [], daily: [], weekly: [], monthly: [] },
    superacion: { objectives: [], daily: [], weekly: [], monthly: [] },
    relaciones: { objectives: [], daily: [], weekly: [], monthly: [] },
    trabajo: { objectives: [], daily: [], weekly: [], monthly: [] }
  },
  monthlyNotes: {}
};

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();
let selectedEventDate = null;

// ===== UTILS =====
let progressChartInstance = null;

const uid = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (window.ExecuteAuth && typeof window.ExecuteAuth.saveAndSync === 'function') {
    window.ExecuteAuth.saveAndSync();
  }
}

function load() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    const loaded = JSON.parse(data);
    Object.assign(state, loaded);
  }
  if (!state.weeklyHabits || !Array.isArray(state.weeklyHabits) || state.weeklyHabits.length === 0) {
    state.weeklyHabits = [
      { id: 'wh1', name: '1. [Escribe tu hábito aquí]', area: 'salud', daysTarget: 1, checks: [false] },
      { id: 'wh2', name: '2. [Escribe tu hábito aquí]', area: 'superacion', daysTarget: 3, checks: [false, false, false] },
      { id: 'wh3', name: '3. [Escribe tu hábito aquí]', area: 'finanzas', daysTarget: 2, checks: [false, false] },
      { id: 'wh4', name: '4. [Escribe tu hábito aquí]', area: 'trabajo', daysTarget: 6, checks: [false, false, false, false, false, false] }
    ];
  }
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function isToday(year, month, day) {
  const d = new Date();
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}

// ===== NAVIGATION =====
function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === tabId));
  const target = document.querySelector(`#tab-${tabId}`);
  if (target) target.classList.add('active');

  if (tabId === 'monthly') renderMonthly();
  else if (tabId === 'weekly-planner') renderWeeklyPlanner();
  else if (tabId === 'radar') renderRadar();
  else if (tabId === 'calendar') renderCalendar();
  else if (tabId === 'annual') renderAnnual();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => switchTab(item.dataset.tab));
});

// ===== MONTHLY TAB =====
const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function renderMonthly() {
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  document.getElementById('monthBigTitle').textContent = monthNames[currentMonth];
  document.getElementById('monthYear').textContent = currentYear;

  // Render Radar 5 Áreas & Plan Semanal in main view
  renderRadar();
  renderWeeklyPlanner();

  // Tabs style
  document.querySelectorAll('.month-tab-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.month) === currentMonth);
  });

  const grid = document.getElementById('trackerGrid');
  grid.innerHTML = '';

  // Header row
  let headerHtml = `<div class="grid-header-row">
                      <div class="grid-header-name-cell">HÁBITOS</div>
                      <div class="grid-header-days">`;
  for (let d = 1; d <= daysInMonth; d++) {
    const todayClass = isToday(currentYear, currentMonth, d) ? 'today-header' : '';
    headerHtml += `<div class="day-header-cell ${todayClass}">${d}</div>`;
  }
  headerHtml += `</div></div>`;
  grid.innerHTML = headerHtml;

  if (state.habits.length === 0) {
    grid.innerHTML += `<div class="empty-state"><div class="es-icon">🌱</div><p>No tienes hábitos aún. ¡Añade uno para empezar!</p></div>`;
  } else {
    state.habits.forEach((habit, hIdx) => {
      const areaInfo = defaultAreas.find(a => a.id === habit.area) || { color: '#888' };
      
      // Calculate Streak
      let streak = 0;
      const todayDate = new Date();
      const currentCheckingMonth = new Date(currentYear, currentMonth, 1);
      
      // Only show meaningful streak if we are viewing the current actual month
      if (currentMonth === todayDate.getMonth() && currentYear === todayDate.getFullYear()) {
        const todayNum = todayDate.getDate();
        for (let d = todayNum; d >= 1; d--) {
          if (habit.data && habit.data[`${currentYear}-${currentMonth}-${d}`]) {
            streak++;
          } else {
            // Stop counting streak on the first missed day (if we don't count today as missed yet if it's early.. but let's be strict: if yesterday is missed, streak is 0. If today is missed but yesterday isn't, streak is last streak. For simplicity, straight contiguous count backwards from today inclusive)
            // If they didn't check today but checked yesterday, the streak is technically active but let's just count backwards from today.
            if (d !== todayNum) break; 
            // If d == todayNum and it's missing, we check yesterday.
          }
        }
        // Small correction: if today is missed but yesterday was checked, the streak isn't 0.
        if (streak === 0 && todayNum > 1) {
          let yesterdayStreak = 0;
          for (let d = todayNum - 1; d >= 1; d--) {
             if (habit.data && habit.data[`${currentYear}-${currentMonth}-${d}`]) yesterdayStreak++;
             else break;
          }
          streak = yesterdayStreak;
        }
      }

      const row = document.createElement('div');
      row.className = 'habit-row';
      
      let html = `<div class="habit-row-inner">
                    <div class="habit-name-cell" title="${habit.name}">
                      <div class="habit-area-dot" style="background:${areaInfo.color}"></div>
                      <span style="flex:1;overflow:hidden;text-overflow:ellipsis" id="habit-name-${habit.id}">${habit.name}</span>
                      ${streak > 2 ? `<span class="streak-badge visible" title="Racha actual">🔥 ${streak}</span>` : ''}
                      <div class="habit-actions-group">
                        <button class="habit-edit-btn" data-id="${habit.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:14px; padding:0 4px;">✎</button>
                        <button class="habit-delete-btn" data-id="${habit.id}">✕</button>
                      </div>
                    </div>
                    <div class="habit-days-row">`;
                    
      const todayNum = new Date().getDate();
      const isCurrentMonth = currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${currentYear}-${currentMonth}-${d}`;
        const isChecked = habit.data && habit.data[dateKey];
        const isFuture = isCurrentMonth && d > todayNum;
        let cName = 'day-cell';
        if (isChecked) cName += ' checked';
        if (isFuture) cName += ' future';
        if (isToday(currentYear, currentMonth, d)) cName += ' today';

        html += `<div class="${cName}" data-habit="${habit.id}" data-date="${dateKey}" ${isFuture? '':'onclick="toggleHabitDay(this)"'}></div>`;
      }
      html += `</div></div>`;
      row.innerHTML = html;
      grid.appendChild(row);
    });
  }

  // Bind delete habit
  document.querySelectorAll('.habit-delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if(confirm('¿Seguro de eliminar este hábito?')){
        state.habits = state.habits.filter(h => h.id !== id);
        save(); renderMonthly();
      }
    });
  });

  // Bind edit habit
  document.querySelectorAll('.habit-edit-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const habit = state.habits.find(h => h.id === id);
      if(habit) {
        const newName = prompt('Editar nombre del hábito:', habit.name);
        if(newName && newName.trim() !== '') {
          habit.name = newName.trim();
          save(); renderMonthly();
        }
      }
    });
  });

  // Load Notes
  const notesKey = `${currentYear}-${currentMonth}`;
  const notesArea = document.getElementById('monthlyNotes');
  if (notesArea) {
    if(!state.monthlyNotes) state.monthlyNotes = {};
    notesArea.value = state.monthlyNotes[notesKey] || '';
    
    // Auto-save notes on blur or input
    notesArea.oninput = function() {
      state.monthlyNotes[notesKey] = this.value;
      save(); // Save silently
    };
  }

  updateMonthProgress();
  renderWeeklyDonuts();
  renderProgressChart();
}

window.toggleHabitDay = function(el) {
  const habitId = el.dataset.habit;
  const dateKey = el.dataset.date;
  const habit = state.habits.find(h => h.id === habitId);
  if(!habit) return;
  if(!habit.data) habit.data = {};
  
  if (habit.data[dateKey]) delete habit.data[dateKey];
  else habit.data[dateKey] = true;

  save();
  renderMonthly();
}

function updateMonthProgress() {
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  let totalChecks = 0;
  let possible = state.habits.length * daysInMonth;

  if (possible === 0) {
    document.getElementById('monthProgressPct').textContent = '0%';
    document.getElementById('monthProgressFill').style.width = '0%';
    return;
  }

  state.habits.forEach(h => {
    if(h.data){
      for(let d=1; d<=daysInMonth; d++){
        if(h.data[`${currentYear}-${currentMonth}-${d}`]) totalChecks++;
      }
    }
  });

  const pct = Math.round((totalChecks / possible) * 100);
  document.getElementById('monthProgressPct').textContent = pct + '%';
  document.getElementById('monthProgressFill').style.width = pct + '%';
}

function renderWeeklyDonuts() {
  const container = document.getElementById('weeklyDonuts');
  container.innerHTML = '';
  if(state.habits.length === 0){ container.innerHTML = '<div class="empty-state"><p>Sin datos semanales.</p></div>'; return; }

  for (let w = 1; w <= 4; w++) {
    const startDay = (w - 1) * 7 + 1;
    let endDay = w * 7;
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    if(w === 4) endDay = daysInMonth;

    let possible = state.habits.length * (endDay - startDay + 1);
    let checks = 0;
    state.habits.forEach(h => {
      if(h.data){
        for(let d=startDay; d<=endDay; d++){
          if(h.data[`${currentYear}-${currentMonth}-${d}`]) checks++;
        }
      }
    });

    const pct = possible === 0 ? 0 : Math.round((checks / possible) * 100);
    const circ = 2 * Math.PI * 26; // r=26
    const dash = (pct / 100) * circ;

    container.innerHTML += `
      <div class="donut-card">
        <svg class="donut-svg" viewBox="0 0 64 64">
          <circle class="donut-track" cx="32" cy="32" r="26"></circle>
          <circle class="donut-fill" cx="32" cy="32" r="26" stroke="#d4a017" stroke-dasharray="${dash} ${circ}" transform="rotate(-90 32 32)"></circle>
          <text class="donut-label" x="32" y="32">${pct}%</text>
        </svg>
        <div class="donut-week-label">Semana ${w}</div>
      </div>
    `;
  }
}

// ── Daily Line Chart ──
function renderProgressChart() {
  const ctx = document.getElementById('progressChart');
  if(!ctx) return;
  
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const labels = [];
  const dataPoints = [];
  
  const totalHabits = state.habits.length;

  for (let d = 1; d <= daysInMonth; d++) {
    // Label: Day number
    labels.push(d.toString());
    
    if (totalHabits === 0) {
      dataPoints.push(0);
      continue;
    }
    
    let checksToday = 0;
    state.habits.forEach(h => {
      if(h.data && h.data[`${currentYear}-${currentMonth}-${d}`]) {
        checksToday++;
      }
    });
    
    const pct = Math.round((checksToday / totalHabits) * 100);
    dataPoints.push(pct);
  }

  // If a chart already exists, destroy it before re-rendering
  if (progressChartInstance) {
    progressChartInstance.destroy();
  }

  // Create new chart
  progressChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '% Diario Completado',
        data: dataPoints,
        borderColor: '#d4a017', // Gold line
        backgroundColor: 'rgba(212, 160, 23, 0.2)', // Semi-transparent gold area
        borderWidth: 2,
        pointBackgroundColor: '#111',
        pointBorderColor: '#d4a017',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true, // Fill under the line
        tension: 0.3 // Smooth curves
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: '#d4a017',
          bodyColor: '#fff',
          callbacks: {
            label: function(context) {
              return 'Completado: ' + context.parsed.y + '%';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: 'rgba(240, 230, 200, 0.5)' }
        },
        y: {
          beginAtZero: true,
          suggestedMax: 100,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: 'rgba(240, 230, 200, 0.5)',
            callback: function(value) { return value + '%'; }
          }
        }
      }
    }
  });
}

// Month navigation binding
document.querySelectorAll('.month-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentMonth = parseInt(btn.dataset.month);
    renderMonthly();
  });
});

function toggleModalHabitType(type) {
  const wrap = document.getElementById('modalWeeklyDaysGroup');
  if (wrap) {
    wrap.style.display = type === 'weekly' ? 'block' : 'none';
  }
}
window.toggleModalHabitType = toggleModalHabitType;

// Add habit modal
document.getElementById('addHabitBtn').addEventListener('click', () => {
  document.getElementById('habitNameInput').value = '';
  document.getElementById('addHabitModal').classList.add('open');
});
document.getElementById('closeHabitModal').addEventListener('click', () => document.getElementById('addHabitModal').classList.remove('open'));
document.getElementById('cancelHabitModal').addEventListener('click', () => document.getElementById('addHabitModal').classList.remove('open'));

document.getElementById('saveHabitBtn').addEventListener('click', () => {
  const nameInput = document.getElementById('habitNameInput');
  const areaSelect = document.getElementById('habitAreaSelect');
  const typeSelect = document.getElementById('habitTypeSelect');
  const daysSelect = document.getElementById('habitDaysSelect');

  const name = nameInput ? nameInput.value.trim() : '';
  const area = areaSelect ? areaSelect.value : 'salud';
  const type = typeSelect ? typeSelect.value : 'weekly';

  if (!name) return alert('Ingresa un nombre para el hábito');

  if (type === 'weekly') {
    const daysTarget = parseInt(daysSelect ? daysSelect.value : '3', 10);
    const checks = new Array(daysTarget).fill(false);
    if (!state.weeklyHabits) state.weeklyHabits = [];
    state.weeklyHabits.push({ id: uid(), name, area, daysTarget, checks });
  } else {
    state.habits.push({ id: uid(), name, area, data: {} });
  }

  save();
  document.getElementById('addHabitModal').classList.remove('open');
  renderMonthly();
});

// ===== CALENDAR TAB =====
function renderCalendar() {
  document.getElementById('calMonthLabel').textContent = `${monthNames[calMonth]} ${calYear}`;
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  const daysArr = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  daysArr.forEach(d => grid.innerHTML += `<div class="cal-day-header">${d}</div>`);

  let firstDay = new Date(calYear, calMonth, 1).getDay();
  if (firstDay === 0) firstDay = 7;
  const daysInMonth = getDaysInMonth(calYear, calMonth);

  for (let i = 1; i < firstDay; i++) {
    grid.innerHTML += `<div class="cal-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dKey = `${calYear}-${calMonth}-${d}`;
    const evs = state.events.filter(e => e.date === dKey);
    const hasEv = evs.length > 0 ? 'has-event' : '';
    const todayClass = isToday(calYear, calMonth, d) ? 'today' : '';

    grid.innerHTML += `<div class="cal-day ${hasEv} ${todayClass}" onclick="openAddEventModal('${dKey}', ${d})">${d}</div>`;
  }

  renderEventsList();
}

document.getElementById('calPrevMonth').addEventListener('click', () => {
  calMonth--; if(calMonth < 0){ calMonth=11; calYear--; } renderCalendar();
});
document.getElementById('calNextMonth').addEventListener('click', () => {
  calMonth++; if(calMonth > 11){ calMonth=0; calYear++; } renderCalendar();
});

window.openAddEventModal = function(dateKey, num) {
  selectedEventDate = dateKey;
  document.getElementById('eventModalDate').textContent = `${num} de ${monthNames[calMonth]} ${calYear}`;
  document.getElementById('eventTitleInput').value = '';
  document.getElementById('addEventModal').classList.add('open');
};

document.getElementById('closeEventModal').addEventListener('click', () => document.getElementById('addEventModal').classList.remove('open'));
document.getElementById('cancelEventModal').addEventListener('click', () => document.getElementById('addEventModal').classList.remove('open'));

document.getElementById('saveEventBtn').addEventListener('click', () => {
  const title = document.getElementById('eventTitleInput').value.trim();
  const priority = document.getElementById('eventPrioritySelect').value;
  if (!title) return alert('Escribe el título');
  
  state.events.push({ id: uid(), date: selectedEventDate, title, priority });
  state.events.sort((a,b)=> new Date(a.date) - new Date(b.date));
  save();
  renderCalendar();
  document.getElementById('addEventModal').classList.remove('open');
});

function renderEventsList() {
  const list = document.getElementById('eventsList');
  list.innerHTML = '';
  let count = 0;

  state.events.forEach(ev => {
    const dPart = ev.date.split('-');
    if(parseInt(dPart[0]) === calYear && parseInt(dPart[1]) === calMonth) {
      count++;
      list.innerHTML += `
        <div class="event-item ${ev.priority}">
          <div class="event-date">${dPart[2]} ${monthNames[calMonth].substring(0,3)}</div>
          <div class="event-text">${ev.title}</div>
          <button class="event-delete" onclick="deleteEvent('${ev.id}')">✕</button>
        </div>
      `;
    }
  });

  if (count === 0) list.innerHTML = `<div class="empty-state" style="padding:20px"><p>No hay eventos en este mes.</p></div>`;
}
window.deleteEvent = function(id) {
  if(confirm('¿Eliminar evento?')){
    state.events = state.events.filter(e => e.id !== id);
    save(); renderCalendar();
  }
}

// ===== ANNUAL GOALS TAB =====
function renderAnnual() {
  document.getElementById('annualYear').textContent = currentYear;
  const grid = document.getElementById('annualGrid');
  grid.innerHTML = '';

  let totalDone = 0, totalGoals = 0;

  defaultAreas.forEach(area => {
    const goals = state.annualGoals[area.id] || [];
    const doneCount = goals.filter(g => g.done).length;
    totalGoals += goals.length;
    totalDone += doneCount;
    
    const pct = goals.length === 0 ? 0 : Math.round((doneCount / goals.length) * 100);
    const circ = 2 * Math.PI * 23;
    const dash = (pct / 100) * circ;

    let html = `
      <div class="annual-card" style="border-top-color: ${area.color}">
        <div class="annual-card-header">
          <span class="annual-card-icon">${area.icon}</span>
          <span class="annual-card-title">${area.title}</span>
        </div>
        
        <div class="annual-ring-wrap">
          <svg class="annual-ring-svg" viewBox="0 0 52 52">
            <circle class="annual-ring-track" cx="26" cy="26" r="23"></circle>
            <circle class="annual-ring-fill" cx="26" cy="26" r="23" stroke="${area.color}" stroke-dasharray="${dash} ${circ}" transform="rotate(-90 26 26)"></circle>
            <text class="annual-ring-pct" fill="${area.color}" x="26" y="26">${pct}%</text>
          </svg>
          <div class="annual-ring-stats"><b>${doneCount}</b> de ${goals.length} completas</div>
        </div>
        
        <div class="annual-goals-list">
    `;

    goals.forEach(g => {
      html += `
        <div class="annual-goal-item ${g.done ? 'done':''}" onclick="toggleAnnualGoal('${area.id}', '${g.id}', event)">
          <div class="annual-goal-cb">${g.done ? '✓':''}</div>
          <div class="annual-goal-text">${g.text}</div>
          <button class="annual-goal-del" onclick="deleteAnnualGoal('${area.id}', '${g.id}', event)">✕</button>
        </div>
      `;
    });

    html += `
        </div>
        <div class="annual-add-row">
          <input type="text" class="annual-add-input" id="annual-input-${area.id}" placeholder="Nueva meta anual..." onkeydown="if(event.key==='Enter') addAnnualGoal('${area.id}')"/>
          <button class="annual-add-btn" onclick="addAnnualGoal('${area.id}')">+</button>
        </div>
      </div>
    `;
    grid.innerHTML += html;
  });

  document.getElementById('annualTotalNum').textContent = `${totalDone}/${totalGoals}`;
}

window.addAnnualGoal = function(areaId) {
  const input = document.getElementById(`annual-input-${areaId}`);
  const text = input.value.trim();
  if(!text) return;
  if(!state.annualGoals[areaId]) state.annualGoals[areaId] = [];
  state.annualGoals[areaId].push({ id: uid(), text, done: false });
  input.value = '';
  save(); renderAnnual();
}

window.deleteAnnualGoal = function(areaId, goalId, e) {
  e.stopPropagation();
  if(confirm('¿Eliminar meta?')){
    state.annualGoals[areaId] = state.annualGoals[areaId].filter(g => g.id !== goalId);
    save(); renderAnnual();
  }
}

window.toggleAnnualGoal = function(areaId, goalId, e) {
  if (e.target.classList.contains('annual-goal-del')) return;
  const goal = state.annualGoals[areaId].find(g => g.id === goalId);
  if(goal) {
    goal.done = !goal.done;
    save(); renderAnnual();
    if(goal.done) shootConfetti();
  }
}

function shootConfetti() {
  for(let i=0; i<30; i++){
    const c = document.createElement('div');
    c.className = 'confetti-particle';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.top = '-20px';
    c.style.backgroundColor = ['#e74c3c','#3498db','#f1c40f','#2ecc71','#9b59b6'][Math.floor(Math.random()*5)];
    c.style.width = Math.random() * 8 + 4 + 'px';
    c.style.height = c.style.width;
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1200);
  }
}

// ===== LIFE AREAS TAB =====
let activeAreaTabs = {};

function renderAreas() {
  const grid = document.getElementById('areasCardsGrid');
  grid.innerHTML = '';

  defaultAreas.forEach(area => {
    if(!activeAreaTabs[area.id]) activeAreaTabs[area.id] = 'objectives';
    const activeTab = activeAreaTabs[area.id];
    const dataList = state.lifeAreas[area.id][activeTab] || [];

    let html = `
      <div class="area-card" style="border-top: 3px solid ${area.color}">
        <div class="area-card-header">
          <span class="area-card-icon">${area.icon}</span>
          <span class="area-card-title">${area.title}</span>
        </div>
        <div class="area-tab-bar">
          <button class="area-tab ${activeTab==='objectives'?'active':''}" onclick="setAreaTab('${area.id}', 'objectives')">Objetivos</button>
          <button class="area-tab ${activeTab==='daily'?'active':''}" onclick="setAreaTab('${area.id}', 'daily')">Diarios</button>
          <button class="area-tab ${activeTab==='weekly'?'active':''}" onclick="setAreaTab('${area.id}', 'weekly')">Semanales</button>
          <button class="area-tab ${activeTab==='monthly'?'active':''}" onclick="setAreaTab('${area.id}', 'monthly')">Mensuales</button>
        </div>
        <div class="area-card-body">
          <ul class="area-item-list">
    `;

    if(dataList.length === 0) {
      html += `<li class="area-list-item" style="color:#666; justify-content:center"><i>Sin registros</i></li>`;
    } else {
      dataList.forEach(item => {
        html += `
          <li class="area-list-item">
            <div class="area-list-bullet" style="background:${area.color}"></div>
            <span style="flex:1">${item.text}</span>
            <button class="area-list-del" onclick="deleteAreaItem('${area.id}', '${activeTab}', '${item.id}')">✕</button>
          </li>
        `;
      });
    }

    const placeholderNames = { objectives: 'Meta/Objetivo...', daily: 'Hábito diario...', weekly: 'Hábito semanal...', monthly: 'Hábito mensual...' };
    
    html += `
          </ul>
          <div class="area-add-row">
            <input type="text" class="area-add-input" id="area-input-${area.id}" placeholder="${placeholderNames[activeTab]}" onkeydown="if(event.key==='Enter') addAreaItem('${area.id}')"/>
            <button class="area-add-btn" onclick="addAreaItem('${area.id}')">+</button>
          </div>
        </div>
      </div>
    `;
    grid.innerHTML += html;
  });
}

window.setAreaTab = function(areaId, tabId) {
  activeAreaTabs[areaId] = tabId;
  renderAreas();
}

window.addAreaItem = function(areaId) {
  const input = document.getElementById(`area-input-${areaId}`);
  const text = input.value.trim();
  if(!text) return;
  const tabId = activeAreaTabs[areaId];
  if(!state.lifeAreas[areaId][tabId]) state.lifeAreas[areaId][tabId] = [];
  state.lifeAreas[areaId][tabId].push({ id: uid(), text });
  save(); renderAreas();
}

window.deleteAreaItem = function(areaId, tabId, itemId) {
  if(confirm('¿Eliminar este elemento?')){
    state.lifeAreas[areaId][tabId] = state.lifeAreas[areaId][tabId].filter(i => i.id !== itemId);
    save(); renderAreas();
  }
}

// ===== WEEKLY PLANNER (IMAGE 2) =====
function renderWeeklyPlanner() {
  const container = document.getElementById('weeklyPlannerList');
  if (!container) return;
  container.innerHTML = '';

  if (!state.weeklyHabits || state.weeklyHabits.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-dim);">
        <p>No tienes hábitos semanales configurados.</p>
        <button class="btn-gold" style="margin-top: 14px;" onclick="document.getElementById('addWeeklyHabitModal').classList.add('open')">+ Añadir Primer Hábito</button>
      </div>
    `;
    return;
  }

  state.weeklyHabits.forEach((habit, idx) => {
    const area = defaultAreas.find(a => a.id === habit.area) || defaultAreas[0];
    
    if (!habit.checks) habit.checks = [];
    const target = habit.daysTarget || 1;
    while (habit.checks.length < target) habit.checks.push(false);
    if (habit.checks.length > target) habit.checks = habit.checks.slice(0, target);

    const row = document.createElement('div');
    row.className = 'wp-row';

    let habitCol = `
      <div class="wp-col-habit">
        <span class="wp-row-index">${idx + 1}.</span>
        <div class="wp-habit-name-wrap">
          <input type="text" class="wp-habit-name" value="${escapeHtml(habit.name)}" onchange="updateWeeklyHabitName('${habit.id}', this.value)" placeholder="[Escribe tu hábito aquí]" />
          <span class="wp-area-tag" style="color: ${area.color}; border: 1px solid ${area.color}40;">
            ${area.icon} ${area.title}
          </span>
        </div>
      </div>
    `;

    let daysCol = `
      <div class="wp-col-days">
        <div class="wp-days-val">
          <button class="wp-days-btn" onclick="updateWeeklyDays('${habit.id}', -1)">-</button>
          <span>${habit.daysTarget}</span>
          <button class="wp-days-btn" onclick="updateWeeklyDays('${habit.id}', 1)">+</button>
        </div>
      </div>
    `;

    let boxesHtml = '';
    for (let i = 0; i < habit.daysTarget; i++) {
      const isChecked = habit.checks[i];
      boxesHtml += `
        <div class="wp-box ${isChecked ? 'checked' : ''}" onclick="toggleWeeklyBox('${habit.id}', ${i})">
          ${isChecked ? '✓' : ''}
        </div>
      `;
    }

    let boxesCol = `
      <div class="wp-col-boxes">
        <div class="wp-boxes-container">
          ${boxesHtml}
        </div>
      </div>
    `;

    let opsCol = `
      <div class="wp-col-ops">
        <button class="wp-del-btn" onclick="deleteWeeklyHabit('${habit.id}')" title="Eliminar hábito">🗑️</button>
      </div>
    `;

    row.innerHTML = habitCol + daysCol + boxesCol + opsCol;
    container.appendChild(row);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

window.toggleWeeklyBox = function(habitId, index) {
  const habit = state.weeklyHabits.find(h => h.id === habitId);
  if (!habit) return;
  if (!habit.checks) habit.checks = [];
  habit.checks[index] = !habit.checks[index];
  save();
  renderWeeklyPlanner();
  renderRadar();
};

window.updateWeeklyDays = function(habitId, delta) {
  const habit = state.weeklyHabits.find(h => h.id === habitId);
  if (!habit) return;
  const newDays = Math.max(1, Math.min(7, (habit.daysTarget || 1) + delta));
  habit.daysTarget = newDays;
  if (!habit.checks) habit.checks = [];
  while (habit.checks.length < newDays) habit.checks.push(false);
  if (habit.checks.length > newDays) habit.checks = habit.checks.slice(0, newDays);
  save();
  renderWeeklyPlanner();
  renderRadar();
};

window.updateWeeklyHabitName = function(habitId, newName) {
  const habit = state.weeklyHabits.find(h => h.id === habitId);
  if (!habit) return;
  habit.name = newName.trim() || '[Escribe tu hábito aquí]';
  save();
};

window.deleteWeeklyHabit = function(habitId) {
  if (confirm('¿Eliminar este hábito semanal?')) {
    state.weeklyHabits = state.weeklyHabits.filter(h => h.id !== habitId);
    save();
    renderWeeklyPlanner();
    renderRadar();
  }
};

// ===== RADAR CHART 5 ÁREAS (IMAGE 1) =====
let radarChartInstance = null;

function renderRadar() {
  const canvas = document.getElementById('radarChartCanvas');
  const sidebar = document.getElementById('radarSideInfo');
  if (!canvas || !sidebar) return;

  const areaScores = {};
  defaultAreas.forEach(a => {
    areaScores[a.id] = { completed: 0, target: 0, percentage: 0 };
  });

  // 1. Weekly Habits
  if (state.weeklyHabits && state.weeklyHabits.length > 0) {
    state.weeklyHabits.forEach(h => {
      const aId = h.area || 'salud';
      if (!areaScores[aId]) areaScores[aId] = { completed: 0, target: 0, percentage: 0 };
      const target = h.daysTarget || 1;
      const completed = (h.checks || []).filter(c => c === true).length;
      areaScores[aId].target += target;
      areaScores[aId].completed += completed;
    });
  }

  // 2. Monthly Habits
  if (state.habits && state.habits.length > 0) {
    const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
    state.habits.forEach(h => {
      const aId = h.area || 'salud';
      if (!areaScores[aId]) areaScores[aId] = { completed: 0, target: 0, percentage: 0 };
      let completedInMonth = 0;
      if (h.data) {
        Object.keys(h.data).forEach(dayKey => {
          if (h.data[dayKey] === true) completedInMonth++;
        });
      }
      areaScores[aId].target += daysInCurrentMonth;
      areaScores[aId].completed += completedInMonth;
    });
  }

  const labels = [];
  const realData = [];
  const optimalData = [];
  let totalPctSum = 0;

  defaultAreas.forEach(a => {
    const stats = areaScores[a.id];
    let pct = 0;
    if (stats.target > 0) {
      pct = Math.round((stats.completed / stats.target) * 100);
    } else {
      pct = 0; // 0% baseline when no habits assigned
    }
    stats.percentage = pct;
    totalPctSum += pct;

    labels.push(`${a.icon} ${a.title}`);
    realData.push(pct);
    optimalData.push(100);
  });

  const overallAvg = Math.round(totalPctSum / defaultAreas.length);
  const overallBadge = document.getElementById('radarOverallPct');
  if (overallBadge) overallBadge.textContent = `${overallAvg}%`;

  if (typeof Chart !== 'undefined') {
    if (radarChartInstance) {
      radarChartInstance.data.datasets[0].data = realData;
      radarChartInstance.update();
    } else {
      const ctx = canvas.getContext('2d');
      radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Cumplimiento Real (%)',
              data: realData,
              backgroundColor: 'rgba(241, 196, 15, 0.35)',
              borderColor: '#f1c40f',
              borderWidth: 3,
              pointBackgroundColor: '#f1c40f',
              pointBorderColor: '#ffffff',
              pointHoverBackgroundColor: '#ffffff',
              pointHoverBorderColor: '#f1c40f',
              pointRadius: 6
            },
            {
              label: 'Meta Óptima (100%)',
              data: optimalData,
              backgroundColor: 'rgba(52, 152, 219, 0.05)',
              borderColor: 'rgba(52, 152, 219, 0.4)',
              borderWidth: 1.5,
              borderDash: [5, 5],
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              angleLines: { color: 'rgba(255, 255, 255, 0.15)' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              pointLabels: {
                color: '#f0e6c8',
                font: { size: 13, weight: '700', family: 'Inter, sans-serif' }
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.5)',
                backdropColor: 'transparent',
                stepSize: 20,
                font: { size: 10 }
              },
              min: 0,
              max: 100
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
  }

  // Render Side Info Panel Cards (escrita a su costado)
  sidebar.innerHTML = '';
  defaultAreas.forEach(a => {
    const stats = areaScores[a.id];
    let badgeText = '⚡ En Desarrollo';
    let badgeColor = '#f1c40f';
    if (stats.percentage >= 90) { badgeText = '🔥 Excelente'; badgeColor = '#2ecc71'; }
    else if (stats.percentage >= 60) { badgeText = '⚡ Buen Ritmo'; badgeColor = '#3498db'; }
    else if (stats.percentage < 30) { badgeText = '⚠️ Enfoque Necesario'; badgeColor = '#e74c3c'; }

    const card = document.createElement('div');
    card.className = 'radar-area-card';
    card.style.setProperty('--area-color', a.color);

    card.innerHTML = `
      <div class="rac-top">
        <div class="rac-title-wrap">
          <span class="rac-icon">${a.icon}</span>
          <span class="rac-name">${a.title}</span>
        </div>
        <span class="rac-pct" style="color: ${a.color};">${stats.percentage}%</span>
      </div>
      <div class="rac-bar-track">
        <div class="rac-bar-fill" style="width: ${stats.percentage}%; background: ${a.color};"></div>
      </div>
      <div class="rac-bottom">
        <span>${stats.completed} de ${stats.target} casillas cumplidas</span>
        <span class="rac-badge" style="color: ${badgeColor}; border: 1px solid ${badgeColor}40;">${badgeText}</span>
      </div>
    `;
    sidebar.appendChild(card);
  });
}

function setupWeeklyHabitModalHandlers() {
  const openBtn = document.getElementById('openAddWeeklyHabitBtn');
  const modal = document.getElementById('addWeeklyHabitModal');
  const closeBtn = document.getElementById('closeWeeklyHabitModal');
  const cancelBtn = document.getElementById('cancelWeeklyHabitModal');
  const saveBtn = document.getElementById('saveWeeklyHabitBtn');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      document.getElementById('whNameInput').value = '';
      modal.classList.add('open');
    });
  }
  if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  if (cancelBtn && modal) cancelBtn.addEventListener('click', () => modal.classList.remove('open'));

  if (saveBtn && modal) {
    saveBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('whNameInput');
      const areaSelect = document.getElementById('whAreaSelect');
      const daysSelect = document.getElementById('whDaysSelect');

      const name = (nameInput ? nameInput.value.trim() : '') || 'Nuevo Hábito Semanal';
      const area = areaSelect ? areaSelect.value : 'salud';
      const daysTarget = parseInt(daysSelect ? daysSelect.value : '3', 10);

      const checks = new Array(daysTarget).fill(false);
      state.weeklyHabits.push({ id: uid(), name, area, daysTarget, checks });
      save();
      modal.classList.remove('open');
      renderWeeklyPlanner();
      const radarTab = document.getElementById('tab-radar');
      if (radarTab && radarTab.classList.contains('active')) {
        renderRadar();
      }
    });
  }
}

// ===== INIT =====
function init() {
  load();
  renderMonthly();
  setupWeeklyHabitModalHandlers();
}

document.addEventListener('DOMContentLoaded', init);
