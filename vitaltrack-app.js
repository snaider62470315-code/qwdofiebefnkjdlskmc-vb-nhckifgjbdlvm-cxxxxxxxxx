// ═══════════════════════════════════════════════════════════════
// VITALTRACK — App JavaScript
// Fitness Tracker | Biometric Profile | Workout Log | Analytics
// ═══════════════════════════════════════════════════════════════

const VT_STORAGE_KEY = 'vitaltrack_v1';

// ── 20 Simple Home Exercises ──
const DEFAULT_EXERCISES = [
  // PECHO (5)
  { id: 'ex_flexion',    name: 'Flexiones',                    group: 'Pecho' },
  { id: 'ex_flex_inc',   name: 'Flexiones Inclinadas',         group: 'Pecho' },
  { id: 'ex_flex_dec',   name: 'Flexiones Declinadas',         group: 'Pecho' },
  { id: 'ex_flex_ancho', name: 'Flexiones Manos Anchas',       group: 'Pecho' },
  { id: 'ex_dips_silla', name: 'Fondos en Silla',             group: 'Pecho' },
  // ESPALDA (5)
  { id: 'ex_superman',   name: 'Superman',                     group: 'Espalda' },
  { id: 'ex_pull_up',    name: 'Jalones en Barra',             group: 'Espalda' },
  { id: 'ex_remo_moc',   name: 'Remo con Mochila',            group: 'Espalda' },
  { id: 'ex_door_row',   name: 'Remo en Puerta',              group: 'Espalda' },
  { id: 'ex_lumbar',     name: 'Extensión Lumbar',            group: 'Espalda' },
  // PIERNAS (5)
  { id: 'ex_squat',      name: 'Sentadilla',                   group: 'Piernas' },
  { id: 'ex_lunge',      name: 'Zancadas',                     group: 'Piernas' },
  { id: 'ex_gluteo',     name: 'Puente de Glúteos',           group: 'Piernas' },
  { id: 'ex_squat_sum',  name: 'Sentadilla Sumo',             group: 'Piernas' },
  { id: 'ex_calf',       name: 'Elevación de Talones',        group: 'Piernas' },
  // HOMBROS (3)
  { id: 'ex_pikes',      name: 'Flexiones Pike',              group: 'Hombros' },
  { id: 'ex_lat_bot',    name: 'Elevaciones con Botella',     group: 'Hombros' },
  { id: 'ex_wall_hs',    name: 'Semi-Parada de Manos',        group: 'Hombros' },
  // ABDOMEN (5)
  { id: 'ex_crunch',     name: 'Crunches',                    group: 'Abdomen' },
  { id: 'ex_plank',      name: 'Plancha',                     group: 'Abdomen' },
  { id: 'ex_bicycle',    name: 'Bicicleta Abdominal',         group: 'Abdomen' },
  { id: 'ex_leg_raise',  name: 'Elevación de Piernas',       group: 'Abdomen' },
  { id: 'ex_mountain',   name: 'Mountain Climbers',           group: 'Abdomen' },
];

const ENERGY_EMOJIS = { 1:'😴', 2:'😕', 3:'😐', 4:'😄', 5:'🔥' };
const GOAL_LABELS = { fat_loss:'🔥 Pérdida de Grasa', maintain:'⚖️ Mantenimiento', muscle_gain:'💪 Ganancia Muscular' };

// ── State ──
let state = {
  profile: { age: null, weight: null, height: null, bodyFat: null, goal: null, name: '' },
  exercises: [],         // [{ id, name, group, custom }]
  sessions: [],          // [{ id, date, duration, exercises:[{id,name,group,sets:[{weight,reps,rpe}]}] }]
  gymCalendar: {},       // { 'YYYY-MM-DD': 'gym'|'rest' }
  hydration: {},         // { 'YYYY-MM-DD': ml }
  bodyWeights: [],       // [{ date:'YYYY-MM-DD', weight }]
  journal: [],           // [{ id, date, energy, sleep, tags, text }]
};

let activeSession = null;
let activeGroup = 'all';   // currently selected muscle group chip

// ── Storage ──
function vtSave() {
  try { 
    localStorage.setItem(VT_STORAGE_KEY, JSON.stringify(state)); 
    if (window.ExecuteAuth && typeof window.ExecuteAuth.saveAndSync === 'function') {
      window.ExecuteAuth.saveAndSync();
    }
  } catch(e) {}
}
function vtLoad() {
  try {
    const raw = localStorage.getItem(VT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
      // Merge exercises (keep defaults not present)
      const existingIds = new Set(state.exercises.map(e => e.id));
      DEFAULT_EXERCISES.forEach(ex => {
        if (!existingIds.has(ex.id)) state.exercises.push({ ...ex });
      });
    } else {
      state.exercises = DEFAULT_EXERCISES.map(e => ({ ...e }));
    }
  } catch(e) {
    state.exercises = DEFAULT_EXERCISES.map(e => ({ ...e }));
  }
}

// ── Helpers ──
const uid = () => `vt_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
const todayStr = () => new Date().toISOString().split('T')[0];
const formatDate = (d) => {
  const [y,m,day] = d.split('-');
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
};
const formatDuration = (secs) => {
  const m = Math.floor(secs/60), s = secs%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

// ══════════════════════════════════════
// TAB NAVIGATION
// ══════════════════════════════════════
function switchTab(tab) {
  document.querySelectorAll('.vt-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.vt-nav-item').forEach(n => n.classList.remove('active'));
  
  const tabEl = document.getElementById(`tab-${tab}`);
  const navEl = document.getElementById(`nav-${tab}`);
  if (tabEl) tabEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  if (tab === 'perfil')   renderPerfil();
  if (tab === 'log')      renderLog();
  if (tab === 'diario')   renderDiario();
}

// ══════════════════════════════════════
// PERFIL BIOMÉTRICO
// ══════════════════════════════════════
function renderPerfil() {
  const p = state.profile;
  if (p.age)     document.getElementById('pfAge').value = p.age;
  if (p.weight)  document.getElementById('pfWeight').value = p.weight;
  if (p.height)  document.getElementById('pfHeight').value = p.height;
  if (p.bodyFat) document.getElementById('pfBodyFat').value = p.bodyFat;
  updateGoalButtons();
  updateCardioDisplay();
  updateStats();
}

function savePerfil() {
  const age     = parseFloat(document.getElementById('pfAge').value);
  const weight  = parseFloat(document.getElementById('pfWeight').value);
  const height  = parseFloat(document.getElementById('pfHeight').value);
  const bodyFat = parseFloat(document.getElementById('pfBodyFat').value) || null;

  if (!age || !weight || !height) return showToast('Completa edad, peso y altura','warn');

  state.profile = { ...state.profile, age, weight, height, bodyFat };
  vtSave();
  updateCardioDisplay();
  updateStats();
  updateUserPill();
  showToast('Perfil guardado ✓');
}

function updateCardioDisplay() {
  const age = state.profile.age;
  const display = document.getElementById('cardioDisplay');
  if (!age) {
    display.innerHTML = '<div class="vt-cardio-placeholder">Ingresa tu edad para calcular</div>';
    return;
  }
  const hrmax = 220 - age;
  const zones = [
    { name: 'Z1 — Calentamiento',    pct:[50,60], color:'#4ade80' },
    { name: 'Z2 — Quema grasa',      pct:[60,70], color:'#34d399' },
    { name: 'Z3 — Aeróbico',         pct:[70,80], color:'#f59e0b' },
    { name: 'Z4 — Anaeróbico',       pct:[80,90], color:'#f97316' },
    { name: 'Z5 — Máximo esfuerzo',  pct:[90,100],color:'#f43f5e' },
  ];
  const goal = state.profile.goal;
  // Recommended km based on goal and age
  let kmRec = goal === 'fat_loss' ? 25 : goal === 'muscle_gain' ? 10 : 15;
  if (age > 50) kmRec = Math.max(kmRec - 5, 5);

  let html = '<div class="vt-cardio-zones">';
  zones.forEach(z => {
    const lo = Math.round(hrmax * z.pct[0]/100);
    const hi = Math.round(hrmax * z.pct[1]/100);
    const barW = z.pct[1] - z.pct[0];
    html += `
      <div class="vt-zone-row">
        <span class="vt-zone-label" style="color:${z.color}">${z.name}</span>
        <div class="vt-zone-bar-wrap"><div class="vt-zone-bar" style="width:${barW*2}%;background:${z.color}"></div></div>
        <span class="vt-zone-bpm">${lo}–${hi} bpm</span>
      </div>`;
  });
  html += '</div>';
  html += `<div class="vt-cardio-rec">
    <div class="vt-cardio-rec-title">Cardio semanal recomendado</div>
    <div class="vt-cardio-rec-val">${kmRec} km/semana</div>
    <div class="vt-cardio-rec-sub">FC Máxima: ${hrmax} bpm | Z. Quema Grasa: ${Math.round(hrmax*0.6)}–${Math.round(hrmax*0.7)} bpm</div>
  </div>`;
  display.innerHTML = html;
  document.getElementById('statHRmax').textContent = hrmax;
  document.getElementById('statKmWeek').textContent = kmRec;
}

function updateStats() {
  const p = state.profile;
  const bmiEl = document.getElementById('statBMI');
  const fatEl = document.getElementById('statFatMass');
  const leanEl = document.getElementById('statLeanMass');
  const catEl = document.getElementById('statCategory');
  const chip = document.getElementById('bmiChip');

  if (p.weight && p.height) {
    const bmi = p.weight / ((p.height/100) ** 2);
    const bmiRound = bmi.toFixed(1);
    bmiEl.textContent = bmiRound;
    chip.textContent = `IMC: ${bmiRound}`;
    let cat = bmi < 18.5 ? 'Bajo peso' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Sobrepeso' : 'Obesidad';
    catEl.textContent = cat;
  }
  if (p.weight && p.bodyFat) {
    const fat = (p.weight * p.bodyFat/100).toFixed(1);
    const lean = (p.weight - parseFloat(fat)).toFixed(1);
    fatEl.textContent = `${fat} kg`;
    leanEl.textContent = `${lean} kg`;
  }
  updateCardioDisplay();
}

function updateGoalButtons() {
  document.querySelectorAll('.vt-goal-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.goal === state.profile.goal);
  });
  const lbl = document.getElementById('userGoalLabel');
  lbl.textContent = state.profile.goal ? GOAL_LABELS[state.profile.goal] : 'Sin meta definida';
}

function updateUserPill() {
  const p = state.profile;
  const nameEl = document.getElementById('userName');
  const avatarEl = document.getElementById('userAvatar');
  if (p.age && p.weight) {
    nameEl.textContent = `${p.weight} kg | ${p.age} años`;
    avatarEl.textContent = '💪';
  }
}

// ══════════════════════════════════════
// REGISTRO DE ENTRENAMIENTO (LOG)
// ══════════════════════════════════════
function renderLog() {
  const lbl = document.getElementById('logDateLabel');
  const now = new Date();
  lbl.textContent = now.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
  renderSessionHistory();
}

function startSession() {
  activeSession = { id: uid(), date: todayStr(), exercises: [] };
  document.getElementById('sessionPanel').style.display = 'block';
  document.getElementById('startSessionBtn').style.display = 'none';
  // Reset manual duration input
  const durInput = document.getElementById('sessionDurInput');
  if (durInput) durInput.value = '';
  renderSessionExercises();
}

function endSession() {
  if (!activeSession) return;
  // Read manually entered duration (minutes)
  const durInput = document.getElementById('sessionDurInput');
  const durationMins = parseFloat(durInput?.value) || 0;
  const duration = Math.round(durationMins * 60);
  activeSession.duration = duration;
  // Remove exercises with no reps or sets info
  activeSession.exercises = activeSession.exercises.filter(ex => ex.reps || ex.sets);
  if (activeSession.exercises.length > 0) {
    state.sessions.unshift(activeSession);
    vtSave();
    updateGymCalendar(activeSession.date, 'gym');
    showToast('Sesión guardada ✓');
  }
  activeSession = null;
  document.getElementById('sessionPanel').style.display = 'none';
  document.getElementById('startSessionBtn').style.display = '';
  document.getElementById('exercisesList').innerHTML = '';
  renderSessionHistory();
}



function renderSessionExercises() {
  const list = document.getElementById('exercisesList');
  list.innerHTML = '';
  if (!activeSession || activeSession.exercises.length === 0) {
    list.innerHTML = `<div class="vt-empty-session"><span>🏋️</span><p>Selecciona un grupo y añade ejercicios</p></div>`;
    return;
  }
  // Filter by active group chip
  let visible = activeSession.exercises;
  if (activeGroup && activeGroup !== 'all') {
    visible = activeSession.exercises.filter(e => e.group === activeGroup);
  }
  if (visible.length === 0) {
    list.innerHTML = `<div class="vt-empty-session"><span>🖼️</span><p>Sin ejercicios de ${activeGroup} en esta sesión</p></div>`;
    return;
  }
  visible.forEach(ex => list.appendChild(buildExerciseBlock(ex)));
}

function buildExerciseBlock(ex) {
  const block = document.createElement('div');
  block.className = 'vt-exercise-block';
  block.id = `exblock-${ex.id}`;

  block.innerHTML = `
    <div class="vt-ex-block-header">
      <div style="flex:1;min-width:0">
        <div class="vt-ex-block-group">${ex.group}</div>
        <input class="vt-ex-name-input" type="text" value="${ex.name}"
          onchange="updateExField('${ex.id}','name',this.value)"
          placeholder="Nombre del ejercicio" />
      </div>
      <button class="vt-ex-block-remove" onclick="removeExerciseFromSession('${ex.id}')" title="Eliminar">×</button>
    </div>
    <div class="vt-ex-inputs">
      <div class="vt-ex-field">
        <label>Series</label>
        <input class="vt-set-input" type="number" id="sets_cnt_${ex.id}" min="1" max="20" value="${ex.sets||3}" placeholder="3"
          onchange="updateExField('${ex.id}','sets',this.value)" />
        <span class="vt-ex-unit">series</span>
      </div>
      <div class="vt-ex-field">
        <label>Repeticiones</label>
        <input class="vt-set-input" type="number" id="reps_cnt_${ex.id}" min="1" max="200" value="${ex.reps||''}" placeholder="12"
          onchange="updateExField('${ex.id}','reps',this.value)" />
        <span class="vt-ex-unit">reps</span>
      </div>
    </div>
  `;

  return block;
}

function updateExField(exId, field, val) {
  if (!activeSession) return;
  const ex = activeSession.exercises.find(e => e.id === exId);
  if (!ex) return;
  ex[field] = field === 'name' ? val : (parseInt(val) || val);
}

function removeExerciseFromSession(exId) {
  if (!activeSession) return;
  activeSession.exercises = activeSession.exercises.filter(e => e.id !== exId);
  renderSessionExercises();
}

function addExerciseToSession(exercise) {
  if (!activeSession) return;
  // Don't duplicate
  if (activeSession.exercises.find(e => e.exId === exercise.id)) {
    showToast('Ejercicio ya añadido', 'warn');
    closeModal('addExerciseModal');
    return;
  }
  const sessionEx = {
    id: uid(),
    exId: exercise.id,
    name: exercise.name,
    group: exercise.group,
    sets: 3,
    reps: '',
  };
  activeSession.exercises.push(sessionEx);
  renderSessionExercises();
  closeModal('addExerciseModal');
}

function renderSessionHistory() {
  const list = document.getElementById('historyList');
  if (state.sessions.length === 0) {
    list.innerHTML = `<div class="vt-no-sessions"><span>📋</span><p>Aquí aparecerán tus sesiones pasadas</p></div>`;
    return;
  }
  list.innerHTML = '';
  state.sessions.slice(0, 20).forEach(session => {
    const card = document.createElement('div');
    card.className = 'vt-history-card';
    const groups = [...new Set(session.exercises.map(e => e.group))];
    const durLabel = session.duration ? formatDuration(session.duration) : '—';
    card.innerHTML = `
      <button class="vt-hc-del" onclick="deleteSession('${session.id}', event)" title="Eliminar sesión">×</button>
      <div class="vt-hc-header">
        <span class="vt-hc-date">${formatDate(session.date)}</span>
        <span class="vt-hc-dur">⏱ ${durLabel}</span>
      </div>
      <div class="vt-hc-exercises">${session.exercises.length} ejercicio${session.exercises.length!==1?'s':''}</div>
      <div class="vt-hc-badges">${groups.map(g => `<span class="vt-hc-badge">${g}</span>`).join('')}</div>
    `;
    list.appendChild(card);
  });
}

function deleteSession(id, e) {
  if (e) e.stopPropagation();
  if (!confirm('¿Eliminar esta sesión permanentemente?')) return;
  state.sessions = state.sessions.filter(s => s.id !== id);
  vtSave();
  renderSessionHistory();
  renderProgreso();
  showToast('Sesión eliminada');
}

function resetAllData() {
  if (!confirm('⚠️ ¿ESTÁS SEGURO? Se borrarán todas las sesiones, historial de peso y diario. Esta acción no se puede deshacer.')) return;
  
  state.sessions = [];
  state.bodyWeights = [];
  state.journal = [];
  state.gymCalendar = {};
  state.hydration = {};
  
  vtSave();
  
  // Refresh UI
  if (document.getElementById('tab-perfil').classList.contains('active')) renderPerfil();
  if (document.getElementById('tab-log').classList.contains('active')) renderLog();
  if (document.getElementById('tab-diario').classList.contains('active')) renderDiario();
  
  updateUserPill();
  showToast('Todos los datos han sido reiniciados', 'warn');
}



// ── Exercise Library Modal ──
function openLibraryModal() {
  openModal('exerciseLibraryModal');
  renderExerciseGrid();
}

function renderExerciseGrid(filter = '', group = '') {
  const grid = document.getElementById('exerciseGrid');
  grid.innerHTML = '';
  let exList = state.exercises;
  if (group) exList = exList.filter(e => e.group === group);
  if (filter) exList = exList.filter(e => e.name.toLowerCase().includes(filter.toLowerCase()));
  exList.forEach(ex => {
    const card = document.createElement('div');
    card.className = 'vt-ex-card';
    card.innerHTML = `
      <span class="vt-ex-card-name">${ex.name}</span>
      <span class="vt-ex-card-group">${ex.group}</span>
      ${ex.custom ? `<button class="vt-ex-card-del" onclick="deleteExercise('${ex.id}', event)">×</button>` : ''}
    `;
    grid.appendChild(card);
  });
}

function createExercise() {
  const name = document.getElementById('newExName').value.trim();
  const group = document.getElementById('newExGroup').value;
  if (!name || !group) return showToast('Completa nombre y grupo','warn');
  const ex = { id: uid(), name, group, custom: true };
  state.exercises.push(ex);
  vtSave();
}

function deleteExercise(id, e) {
  e.stopPropagation();
  if (!confirm('¿Eliminar este ejercicio?')) return;
  state.exercises = state.exercises.filter(ex => ex.id !== id);
  vtSave();
  renderExerciseGrid();
}

// ── Add Exercise to Session Modal ──
function openAddExerciseModal() {
  if (!activeSession) return;
  openModal('addExerciseModal');
  // Filter pick list by the active group chip
  renderPickList('', activeGroup);
}

function renderPickList(filter, group) {
  const list = document.getElementById('exercisePickList');
  list.innerHTML = '';
  let exList = state.exercises;
  // Auto-filter by active group unless 'all'
  if (group && group !== 'all') exList = exList.filter(e => e.group === group);
  
  const searchFilter = filter.toLowerCase().trim();
  if (searchFilter) {
    exList = exList.filter(e => e.name.toLowerCase().includes(searchFilter));
  }

  exList.forEach(ex => {
    const item = document.createElement('div');
    item.className = 'vt-ex-pick-item';
    item.innerHTML = `<span class="vt-ex-pick-name">${ex.name}</span><span class="vt-ex-pick-group">${ex.group}</span>`;
    item.onclick = () => addExerciseToSession(ex);
    list.appendChild(item);
  });

  // Si hay filtro y no hay coincidencia exacta, ofrecer añadir nuevo
  if (searchFilter && !exList.find(e => e.name.toLowerCase() === searchFilter)) {
    const newItem = document.createElement('div');
    newItem.className = 'vt-ex-pick-item vt-ex-pick-new';
    newItem.innerHTML = `
      <span class="vt-ex-pick-new-icon">✨</span>
      <span>Añadir "${filter}"</span>
    `;
    newItem.onclick = () => {
      const newExName = filter.trim();
      const newExGroup = (group && group !== 'all') ? group : 'Otros';
      const newEx = { id: uid(), name: newExName, group: newExGroup, custom: true };
      
      // Guardar en la biblioteca global
      state.exercises.push(newEx);
      vtSave();
      
      // Añadir a la sesión
      addExerciseToSession(newEx);
      
      showToast(`"${newExName}" añadido a la biblioteca y sesión ✓`);
    };
    list.appendChild(newItem);
  }

  if (exList.length === 0 && !searchFilter) {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">No hay ejercicios para este grupo</div>`;
  }
}

// ══════════════════════════════════════
// HÁBITOS & ESTILO DE VIDA
// ══════════════════════════════════════
function renderLifestyle() {
  renderGymCalendar();
  renderHydration();
  renderTUT();
}

function renderGymCalendar() {
  const cal = document.getElementById('gymCalendar');
  cal.innerHTML = '';
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const today = todayStr();

  // Day names header
  ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'vt-cal-day day-name';
    el.textContent = d;
    cal.appendChild(el);
  });

  // First day offset
  const firstDay = new Date(year, month, 1).getDay();
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    cal.appendChild(el);
  }

  const daysInMonth = new Date(year, month+1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const el = document.createElement('div');
    el.className = 'vt-cal-day';
    el.textContent = d;

    const status = state.gymCalendar[dateStr];
    const isToday = dateStr === today;
    const isFuture = dateStr > today;

    if (isFuture) {
      el.classList.add('future');
    } else {
      el.classList.add(status || 'past');
      if (isToday) el.classList.add('today');
      if (!isFuture) {
        el.onclick = () => toggleGymDay(dateStr, el);
      }
    }
    cal.appendChild(el);
  }

  // Calc weekly streak
  let streak = 0, temp = 0;
  for (let d = daysInMonth; d >= 1; d--) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    if (ds > today) continue;
    if (state.gymCalendar[ds] === 'gym') { temp++; } else { if (temp > streak) streak = temp; temp = 0; }
  }
  document.getElementById('weeklyStreak').textContent = `🔥 ${streak} días seguidos`;
}

function toggleGymDay(dateStr, el) {
  const current = state.gymCalendar[dateStr];
  const next = !current ? 'gym' : current === 'gym' ? 'rest' : undefined;
  if (next) state.gymCalendar[dateStr] = next;
  else delete state.gymCalendar[dateStr];
  vtSave();
  el.className = 'vt-cal-day ' + (next || 'past');
  if (dateStr === todayStr()) el.classList.add('today');
  renderGymCalendar(); // re-render for streak
}

function updateGymCalendar(dateStr, status) {
  state.gymCalendar[dateStr] = status;
  vtSave();
  if (document.getElementById('tab-lifestyle').classList.contains('active')) {
    renderGymCalendar();
  }
}

function renderHydration() {
  const today = todayStr();
  const ml = state.hydration[today] || 0;
  const goal = parseFloat(document.getElementById('hydGoal').value) * 1000 || 2500;
  const pct = Math.min(Math.round((ml / goal) * 100), 100);
  document.getElementById('hydrationFill').style.height = pct + '%';
  document.getElementById('hydrationAmt').textContent = ml >= 1000 ? `${(ml/1000).toFixed(1)} L` : `${ml} ml`;
  document.getElementById('hydPct').textContent = pct + '%';
}

function addHydration(ml) {
  const today = todayStr();
  state.hydration[today] = (state.hydration[today] || 0) + ml;
  vtSave();
  renderHydration();
  showToast(`+${ml} ml añadidos 💧`);
}

function resetHydration() {
  const today = todayStr();
  state.hydration[today] = 0;
  vtSave();
  renderHydration();
}

function renderTUT() {
  // Calculate from sessions
  const today = todayStr();
  const weekStart = getWeekStart();
  const monthStart = todayStr().substring(0,7);

  let todaySecs = 0, weekSecs = 0, monthSecs = 0;
  const weekSessions = [];

  state.sessions.forEach(s => {
    if (s.date === today) todaySecs += s.duration || 0;
    if (s.date >= weekStart) weekSecs += s.duration || 0;
    if (s.date.startsWith(monthStart)) monthSecs += s.duration || 0;
    if (s.date >= weekStart) weekSessions.push(s);
  });

  const todayMin = Math.round(todaySecs/60);
  const weekMin  = Math.round(weekSecs/60);
  const monthMin = Math.round(monthSecs/60);

  document.getElementById('tutToday').textContent = `${todayMin} min`;
  document.getElementById('tutTotal').textContent = `${weekMin} min`;
  document.getElementById('tutMonth').textContent = `${monthMin} min`;

  // Ring progress (goal: 300 min/week)
  const goal = 300;
  const pct = Math.min(weekMin / goal, 1);
  const circumference = 251.2;
  const offset = circumference * (1 - pct);
  document.getElementById('tutArc').style.strokeDashoffset = offset;
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}


// ══════════════════════════════════════
// DIARIO DE SENSACIONES
// ══════════════════════════════════════
let journalEnergyLevel = 0;
let journalTags = new Set();

function renderDiario() {
  const now = new Date();
  document.getElementById('journalDate').textContent = now.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
  renderJournalList();
}

function renderJournalList() {
  const list = document.getElementById('journalList');
  if (state.journal.length === 0) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px">No hay entradas aún</div>';
    return;
  }
  list.innerHTML = '';
  [...state.journal].reverse().forEach(entry => {
    const el = document.createElement('div');
    el.className = 'vt-journal-entry';
    const tagsHtml = (entry.tags||[]).map(t => `<span class="vt-je-tag">${t}</span>`).join('');
    const energyEmoji = ENERGY_EMOJIS[entry.energy] || '';
    el.innerHTML = `
      <button class="vt-je-del" onclick="deleteJournalEntry('${entry.id}')">×</button>
      <div class="vt-je-header">
        <span class="vt-je-date">${formatDate(entry.date)}</span>
        <span class="vt-je-energy">${energyEmoji}</span>
        ${entry.sleep ? `<span class="vt-sleep-badge">😴 ${entry.sleep}h</span>` : ''}
        <div class="vt-je-tags">${tagsHtml}</div>
      </div>
      <div class="vt-je-text">${entry.text || '<em style="opacity:0.5">Sin texto</em>'}</div>
    `;
    list.appendChild(el);
  });
}

function saveJournal() {
  const text = document.getElementById('journalText').value.trim();
  const sleep = parseFloat(document.getElementById('sleepHours').value) || null;

  const entry = {
    id: uid(),
    date: todayStr(),
    energy: journalEnergyLevel,
    sleep,
    tags: [...journalTags],
    text,
  };
  state.journal.push(entry);
  vtSave();

  // Reset form
  journalEnergyLevel = 0; journalTags = new Set();
  document.querySelectorAll('.vt-energy-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.vt-tag').forEach(t => t.classList.remove('active'));
  document.getElementById('journalText').value = '';
  document.getElementById('sleepHours').value = '';

  renderJournalList();
  showToast('Entrada guardada ✓');
}

function deleteJournalEntry(id) {
  state.journal = state.journal.filter(e => e.id !== id);
  vtSave();
  renderJournalList();
}

// ══════════════════════════════════════
// MODALS
// ══════════════════════════════════════
function openModal(id) {
  document.getElementById(id).classList.add('active');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ── Toast Notifications ──
function showToast(msg, type='success') {
  const existing = document.getElementById('vt-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'vt-toast';
  const colors = { success:'#00f5a0', warn:'#f59e0b', error:'#f43f5e' };
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    padding:12px 20px;border-radius:10px;
    background:var(--bg-card);border:1px solid ${colors[type]||colors.success};
    color:var(--text-primary);font-size:13px;font-weight:600;
    box-shadow:0 4px 20px rgba(0,0,0,0.5);
    animation:toastIn 0.3s ease;
    font-family:'Outfit',sans-serif;
  `;
  toast.textContent = msg;
  const style = document.createElement('style');
  style.textContent = `@keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`;
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => { if(toast.parentNode) toast.remove(); }, 2800);
}

// ══════════════════════════════════════
// INIT & EVENTS
// ══════════════════════════════════════
function initEvents() {
  // Nav
  document.querySelectorAll('.vt-nav-item').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });

  // Perfil
  document.getElementById('savePerfil').addEventListener('click', savePerfil);
  document.querySelectorAll('.vt-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.profile.goal = btn.dataset.goal;
      vtSave();
      updateGoalButtons();
      updateCardioDisplay();
      updateUserPill();
      const lbl = document.getElementById('userGoalLabel');
      lbl.textContent = GOAL_LABELS[state.profile.goal];
    });
  });

  // Log
  document.getElementById('startSessionBtn').addEventListener('click', startSession);
  document.getElementById('endSessionBtn').addEventListener('click', () => {
    if (confirm('¿Terminar sesión y guardar?')) endSession();
  });
  document.getElementById('addExerciseBtn').addEventListener('click', openAddExerciseModal);
  document.getElementById('manageExercisesBtn').addEventListener('click', openLibraryModal);


  // Muscle group chips — filter session exercises by group
  document.querySelectorAll('.vt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.vt-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeGroup = chip.dataset.group || 'all';
      if (activeSession) renderSessionExercises();
    });
  });



  document.getElementById('resetAllDataBtn').addEventListener('click', resetAllData);

  // Diario
  document.getElementById('saveJournalBtn').addEventListener('click', saveJournal);
  document.querySelectorAll('.vt-energy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      journalEnergyLevel = parseInt(btn.dataset.level);
      document.querySelectorAll('.vt-energy-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('.vt-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const t = tag.dataset.tag;
      if (journalTags.has(t)) { journalTags.delete(t); tag.classList.remove('active'); }
      else { journalTags.add(t); tag.classList.add('active'); }
    });
  });

  // Library modal
  document.getElementById('closeLibraryModal').addEventListener('click', () => closeModal('exerciseLibraryModal'));
  document.getElementById('exerciseLibraryModal').addEventListener('click', e => { if(e.target===e.currentTarget) closeModal('exerciseLibraryModal'); });
  document.getElementById('exSearchInput').addEventListener('input', e => renderExerciseGrid(e.target.value, document.getElementById('exGroupFilter').value));
  document.getElementById('exGroupFilter').addEventListener('change', e => renderExerciseGrid(document.getElementById('exSearchInput').value, e.target.value));
  document.getElementById('createExerciseBtn').addEventListener('click', createExercise);

  // Add exercise modal
  document.getElementById('closeAddExModal').addEventListener('click', () => closeModal('addExerciseModal'));
  document.getElementById('addExerciseModal').addEventListener('click', e => { if(e.target===e.currentTarget) closeModal('addExerciseModal'); });
  document.getElementById('selectExSearch').addEventListener('input', e => renderPickList(e.target.value));

  // Body weight modal
  document.getElementById('closeBodyWeightModal').addEventListener('click', () => closeModal('bodyWeightModal'));
  document.getElementById('bodyWeightModal').addEventListener('click', e => { if(e.target===e.currentTarget) closeModal('bodyWeightModal'); });

  // ESC key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['exerciseLibraryModal','addExerciseModal','bodyWeightModal'].forEach(id => closeModal(id));
    }
  });
}

function init() {
  vtLoad();
  initEvents();
  switchTab('perfil');
  updateUserPill();
}

document.addEventListener('DOMContentLoaded', init);
