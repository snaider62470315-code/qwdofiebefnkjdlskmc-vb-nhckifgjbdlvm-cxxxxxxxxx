// ═══════════════════════════════════════════════════════════════
// NODU — CENTRAL HUB JS
// Clock, Greetings, Cross-App Info Fetching
// ═══════════════════════════════════════════════════════════════

const DOM = {
  greeting: document.getElementById('ndGreeting'),
  date: document.getElementById('ndDate'),
  time: document.getElementById('ndTime'),
  
  // Status labels
  statHabitos: document.getElementById('statHabitos'),
  statVital: document.getElementById('statVital'),
  statFlow: document.getElementById('statFlow'),
};

function initNodu() {
  updateTime();
  setInterval(updateTime, 1000);
  
  fetchHabitosStats();
  fetchVitalTrackStats();
  fetchFlowStateStats();
}

function updateTime() {
  const now = new Date();
  
  // Time
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  DOM.time.textContent = `${hh}:${mm}`;
  
  // Date
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  DOM.date.textContent = `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
  
  // Greeting is now static in HTML, or optionally dynamic per day.
  // We'll keep it simple and powerful as requested by user.
  DOM.greeting.innerHTML = `Empieza el cambio con <span class="nd-accent">Execute</span>`;
}

// ── Cross-App Data Fetching ──

function fetchHabitosStats() {
  try {
    const rawData = localStorage.getItem('habitosData');
    if (rawData) {
      const data = JSON.parse(rawData);
      // Determine active tasks for today
      const today = new Date().toISOString().split('T')[0];
      let pending = 0;
      let total = 0;
      
      const habitsList = (data.monthly && data.monthly.habits) ? data.monthly.habits : [];
      total = habitsList.length;
      
      let completedToday = 0;
      if (data.monthly && data.monthly.records && data.monthly.records[today]) {
        completedToday = Object.keys(data.monthly.records[today]).length;
      }
      
      pending = total - completedToday;
      if (pending > 0) {
        DOM.statHabitos.textContent = `${pending} pendiente${pending > 1 ? 's' : ''}`;
        DOM.statHabitos.style.color = '#10b981';
        DOM.statHabitos.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        DOM.statHabitos.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
      } else if (total > 0 && pending === 0) {
        DOM.statHabitos.textContent = '¡Todo Listo!';
      } else {
         DOM.statHabitos.textContent = 'Activo';
      }
    } else {
      DOM.statHabitos.textContent = 'Listo para iniciar';
    }
  } catch(e) {
    DOM.statHabitos.textContent = 'Activo';
  }
}

function fetchVitalTrackStats() {
  try {
    const rawData = localStorage.getItem('vitaltrack_v1');
    if (rawData) {
      const db = JSON.parse(rawData);
      const isGymToday = db.gymCalendar && db.gymCalendar[new Date().toISOString().split('T')[0]] === 'gym';
      
      if (isGymToday) {
        DOM.statVital.textContent = 'Entrenamiento completado';
        DOM.statVital.style.color = '#00f5a0';
        DOM.statVital.style.borderColor = 'rgba(0, 245, 160, 0.3)';
        DOM.statVital.style.backgroundColor = 'rgba(0, 245, 160, 0.1)';
      } else {
        const lastSession = db.sessions && db.sessions.length > 0 ? db.sessions[0].date : null;
        if (lastSession) {
          DOM.statVital.textContent = `Último registro: ${lastSession}`;
        } else {
          DOM.statVital.textContent = 'Registra tu primer día';
        }
      }
    } else {
      DOM.statVital.textContent = 'Listo para iniciar';
    }
  } catch(e) {
    DOM.statVital.textContent = 'Activo';
  }
}

function fetchFlowStateStats() {
  try {
    const rawData = localStorage.getItem('flowstate_v1');
    if (rawData) {
      const db = JSON.parse(rawData);
      if (db.activeJob) {
        DOM.statFlow.textContent = 'Flujo en progreso';
        DOM.statFlow.style.color = '#a855f7';
        DOM.statFlow.style.borderColor = 'rgba(168, 85, 247, 0.3)';
        DOM.statFlow.style.backgroundColor = 'rgba(168, 85, 247, 0.1)';
      } else {
        const totalRecipes = db.recipes ? db.recipes.length : 0;
        DOM.statFlow.textContent = `${totalRecipes} Receta${totalRecipes !== 1 ? 's' : ''}`;
      }
    } else {
      DOM.statFlow.textContent = 'Listo para iniciar';
    }
  } catch(e) {
    DOM.statFlow.textContent = 'Activo';
  }
}

window.addEventListener('DOMContentLoaded', initNodu);
