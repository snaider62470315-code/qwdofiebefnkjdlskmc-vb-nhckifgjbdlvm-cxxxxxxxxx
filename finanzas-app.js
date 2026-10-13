/* ===== FINANZAS 50/30/20 LOGIC ===== */

const LS_KEY = 'gadzhi_finanzas_data';
let state = {
  totalBalance: 0,
  needs: { limit: 0, spent: 0 },
  wants: { limit: 0, spent: 0 },
  saves: { limit: 0, spent: 0 },
  history: [] // { id, type: 'inc' | 'exp', cat: 'needs'|'wants'|'saves'|null, amt, desc, date }
};

// --- Initialization ---
function init() {
  const saved = localStorage.getItem(LS_KEY);
  if (saved) {
    state = JSON.parse(saved);
  }
  render();
}

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
  render();
}

// --- Rendering ---
const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function render() {
  // Update Overview
  document.getElementById('valTotal').textContent = fmt.format(state.totalBalance);
  
  const needsBal = state.needs.limit - state.needs.spent;
  const wantsBal = state.wants.limit - state.wants.spent;
  const savesBal = state.saves.limit - state.saves.spent;
  
  document.getElementById('valNeeds').textContent = fmt.format(needsBal);
  document.getElementById('valWants').textContent = fmt.format(wantsBal);
  document.getElementById('valSaves').textContent = fmt.format(savesBal);
  
  const pctNeeds = state.needs.limit > 0 ? Math.min(100, (state.needs.spent / state.needs.limit) * 100) : 0;
  const pctWants = state.wants.limit > 0 ? Math.min(100, (state.wants.spent / state.wants.limit) * 100) : 0;
  const pctSaves = state.saves.limit > 0 ? Math.min(100, (state.saves.spent / state.saves.limit) * 100) : 0;
  
  document.querySelector('.bb-card.needs .bb-fill').style.width = pctNeeds + '%';
  document.querySelector('.bb-card.wants .bb-fill').style.width = pctWants + '%';
  document.querySelector('.bb-card.saves .bb-fill').style.width = pctSaves + '%';

  // Update History list
  const list = document.getElementById('txList');
  list.innerHTML = '';
  
  const recent = [...state.history].reverse().slice(0, 50); // Show last 50
  
  if(recent.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:20px;">No hay movimientos recientes.</p>`;
    return;
  }
  
  recent.forEach(tx => {
    let sign = tx.type === 'inc' ? '+' : '-';
    let cName = tx.type === 'inc' ? 'inc' : `exp-${tx.cat}`;
    
    let html = `
      <div class="tx-item ${cName}">
        <div class="tx-left">
          <span class="tx-desc">${tx.desc}</span>
          <span class="tx-date">${new Date(tx.date).toLocaleDateString()}</span>
        </div>
        <div class="tx-amt">${sign}${fmt.format(tx.amt)}</div>
      </div>
    `;
    list.insertAdjacentHTML('beforeend', html);
  });
}

// --- Actions ---
function addIncome() {
  const amt = parseFloat(document.getElementById('inpIncomeAmt').value);
  const desc = document.getElementById('inpIncomeDesc').value || 'Ingreso';
  
  if (!amt || amt <= 0) return alert('Ingresa un monto válido.');
  
  state.totalBalance += amt;
  state.needs.limit += amt * 0.50;
  state.wants.limit += amt * 0.30;
  state.saves.limit += amt * 0.20;
  
  state.history.push({
    id: Date.now().toString(),
    type: 'inc',
    cat: null,
    amt: amt,
    desc: desc,
    date: new Date().toISOString()
  });
  
  closeModals();
  save();
  document.getElementById('inpIncomeAmt').value = '';
  document.getElementById('inpIncomeDesc').value = '';
}

function addExpense() {
  const amt = parseFloat(document.getElementById('inpExpAmt').value);
  const desc = document.getElementById('inpExpDesc').value || 'Gasto';
  const cat = document.getElementById('inpExpCat').value;
  
  if (!amt || amt <= 0) return alert('Ingresa un monto válido.');
  
  // Check category budget and total balance
  const availableInCategory = state[cat].limit - state[cat].spent;
  if (amt > availableInCategory || amt > state.totalBalance) {
    return alert('no tienes suficiente dinero para ese gasto');
  }
  
  state.totalBalance -= amt;
  state[cat].spent += amt;
  
  state.history.push({
    id: Date.now().toString(),
    type: 'exp',
    cat: cat,
    amt: amt,
    desc: desc,
    date: new Date().toISOString()
  });
  
  closeModals();
  save();
  document.getElementById('inpExpAmt').value = '';
  document.getElementById('inpExpDesc').value = '';
}

// --- Modals ---
function openIncomeModal() {
  document.getElementById('incomeModal').classList.add('active');
}
function openExpenseModal() {
  document.getElementById('expenseModal').classList.add('active');
}
function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
}

// Ensure clicking outside closes modal
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModals();
    }
  });
});

// Start
init();
