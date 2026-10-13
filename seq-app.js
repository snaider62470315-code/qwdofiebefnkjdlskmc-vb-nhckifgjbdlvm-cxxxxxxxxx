// ═══════════════════════════════════════════════════════════════
// PREMIUM TASK MANAGEMENT — APP JS
// Single Focus Mode | Flow State | Sequential Dependencies
// ═══════════════════════════════════════════════════════════════

const SF_STORAGE_KEY = 'flowstate_v1';

// ── Default State ──
let state = {
  recipes: [
    {
      id: 'rec_default_1',
      title: 'Publicar Video YouTube',
      desc: 'Flujo estándar para subir, optimizar y publicar.',
      steps: [
        { id: 's1', title: 'Exportar Video Final', desc: 'Asegúrate de exportar en 4K h.264.' },
        { id: 's2', title: 'Diseñar Miniatura', desc: 'Usar la plantilla de Photoshop. Alto contraste.' },
        { id: 's3', title: 'Subir a YouTube', desc: 'Subir archivo, agregar miniatura y esperar procesamiento HD.' },
        { id: 's4', title: 'SEO & Etiquetas', desc: 'Llenar título, descripción con enlaces y tags relevantes.' },
      ]
    }
  ],
  activeJob: null // { recipeId, currentStepIndex, history: [] }
};

// ── DOM Elements ──
const DOM = {
  recipeList: document.getElementById('recipeList'),
  newRecipeBtn: document.getElementById('newRecipeBtn'),
  emptyState: document.getElementById('emptyState'),
  activeJobState: document.getElementById('activeJobState'),
  
  // Job Header
  jobTitle: document.getElementById('jobTitle'),
  jobDesc: document.getElementById('jobDesc'),
  jobProgressFill: document.getElementById('jobProgressFill'),
  
  // Timeline
  stepTimeline: document.getElementById('stepTimeline'),
  
  // Focus Panel
  activeStepTitle: document.getElementById('activeStepTitle'),
  activeStepIndex: document.getElementById('activeStepIndex'),
  activeStepInstructions: document.getElementById('activeStepInstructions'),
  completeStepBtn: document.getElementById('completeStepBtn'),
  upcomingPreview: document.getElementById('upcomingPreview'),
  upcomingStepTitle: document.getElementById('upcomingStepTitle'),
  
  // Modal
  recipeModalOverlay: document.getElementById('recipeModalOverlay'),
  closeRecipeModal: document.getElementById('closeRecipeModal'),
  saveRecipeBtn: document.getElementById('saveRecipeBtn'),
  recipeTitleInput: document.getElementById('recipeTitleInput'),
  recipeDescInput: document.getElementById('recipeDescInput'),
  recipeStepsContainer: document.getElementById('recipeStepsContainer'),
  addStepInputBtn: document.getElementById('addStepInputBtn'),
};

// ── Helpers ──
const uid = () => `sf_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;

// ── Storage ──
function sfSave() {
  try { 
    localStorage.setItem(SF_STORAGE_KEY, JSON.stringify(state)); 
    if (window.ExecuteAuth && typeof window.ExecuteAuth.saveAndSync === 'function') {
      window.ExecuteAuth.saveAndSync();
    }
  } catch(e) {}
}

function sfLoad() {
  try {
    const raw = localStorage.getItem(SF_STORAGE_KEY);
    if (raw) {
      state = { ...state, ...JSON.parse(raw) };
    }
  } catch(e) {}
}

// ── Initialization ──
function init() {
  sfLoad();
  renderSidebar();
  renderWorkspace();
  setupEventListeners();
}

// ── Rendering ──
function renderSidebar() {
  DOM.recipeList.innerHTML = '';
  state.recipes.forEach(recipe => {
    const li = document.createElement('li');
    li.className = 'sf-recipe-item';
    if (state.activeJob && state.activeJob.recipeId === recipe.id) {
      li.classList.add('active');
    }
    li.innerHTML = `<span>📑</span> ${recipe.title}`;
    li.onclick = () => loadJob(recipe.id);
    DOM.recipeList.appendChild(li);
  });
}

function renderWorkspace() {
  if (!state.activeJob) {
    DOM.emptyState.style.display = 'block';
    DOM.activeJobState.style.display = 'none';
    return;
  }
  
  const recipe = state.recipes.find(r => r.id === state.activeJob.recipeId);
  if (!recipe) return;

  DOM.emptyState.style.display = 'none';
  DOM.activeJobState.style.display = 'block';

  // Header
  DOM.jobTitle.textContent = recipe.title;
  DOM.jobDesc.textContent = recipe.desc;
  
  const total = recipe.steps.length;
  const current = state.activeJob.currentStepIndex;
  const isFinished = current >= total;
  
  DOM.jobProgressFill.style.width = `${(current / total) * 100}%`;

  if (isFinished) {
    document.getElementById('jobStatusBadge').textContent = 'COMPLETADO';
    document.getElementById('jobStatusBadge').style.color = 'var(--accent-success)';
    document.getElementById('jobStatusBadge').style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
    document.getElementById('jobStatusBadge').style.borderColor = 'rgba(16, 185, 129, 0.3)';
  } else {
    document.getElementById('jobStatusBadge').textContent = 'EN PROGRESO';
    document.getElementById('jobStatusBadge').style.color = 'var(--accent-active)';
    document.getElementById('jobStatusBadge').style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
    document.getElementById('jobStatusBadge').style.borderColor = 'rgba(59, 130, 246, 0.3)';
  }

  // Timeline
  DOM.stepTimeline.innerHTML = '';
  recipe.steps.forEach((step, idx) => {
    const node = document.createElement('div');
    node.className = 'sf-tl-node';
    
    if (idx < current) node.classList.add('completed');
    else if (idx === current) node.classList.add('active');
    
    node.innerHTML = `
      <div class="sf-tl-indicator">${idx < current ? '✓' : idx + 1}</div>
      <div class="sf-tl-content">
        <div class="sf-tl-title">${step.title}</div>
      </div>
    `;
    DOM.stepTimeline.appendChild(node);
  });

  // Focus Panel (Single Focus Mode)
  if (isFinished) {
    DOM.activeStepTitle.textContent = '¡Flujo Completado!';
    DOM.activeStepInstructions.textContent = 'Has terminado todos los pasos de esta receta. Buen trabajo.';
    DOM.activeStepIndex.textContent = 'FINALIZADO';
    DOM.completeStepBtn.style.display = 'none';
    DOM.upcomingPreview.style.display = 'none';
    return;
  }

  const activeStep = recipe.steps[current];
  DOM.activeStepTitle.textContent = activeStep.title;
  DOM.activeStepInstructions.textContent = activeStep.desc;
  DOM.activeStepIndex.textContent = `Paso ${current + 1} de ${total}`;
  DOM.completeStepBtn.style.display = 'block';

  const nextStep = recipe.steps[current + 1];
  if (nextStep) {
    DOM.upcomingPreview.style.display = 'flex';
    DOM.upcomingStepTitle.textContent = nextStep.title;
  } else {
    DOM.upcomingPreview.style.display = 'none';
  }
}

// ── Actions ──
function loadJob(recipeId) {
  state.activeJob = {
    recipeId: recipeId,
    currentStepIndex: 0,
    startTime: Date.now()
  };
  sfSave();
  renderSidebar();
  renderWorkspace();
}

function completeCurrentStep() {
  if (!state.activeJob) return;
  const recipe = state.recipes.find(r => r.id === state.activeJob.recipeId);
  if (!recipe) return;

  if (state.activeJob.currentStepIndex < recipe.steps.length) {
    state.activeJob.currentStepIndex++;
    sfSave();
    
    // Add simple vibration/feedback if possible
    if(navigator.vibrate) navigator.vibrate(50);
    
    renderWorkspace();
    renderSidebar();
  }
}

// ── Modal & Recipe Creation ──
function openModal() {
  DOM.recipeModalOverlay.classList.add('active');
  DOM.recipeTitleInput.value = '';
  DOM.recipeDescInput.value = '';
  DOM.recipeStepsContainer.innerHTML = '';
  addStepInput(); // start with 1 step
}

function closeModal() {
  DOM.recipeModalOverlay.classList.remove('active');
}

function addStepInput() {
  const num = DOM.recipeStepsContainer.children.length + 1;
  const div = document.createElement('div');
  div.className = 'sf-step-input-row';
  div.innerHTML = `
    <div class="sf-step-drag">⋮⋮</div>
    <div class="sf-step-content">
      <input type="text" placeholder="Paso ${num}: Nombre" class="step-inp-title" required>
      <textarea placeholder="Instrucciones del paso..." class="step-inp-desc"></textarea>
    </div>
    <button class="sf-step-delete" onclick="this.parentElement.remove()">✕</button>
  `;
  DOM.recipeStepsContainer.appendChild(div);
}

function saveRecipe() {
  const title = DOM.recipeTitleInput.value.trim();
  const desc = DOM.recipeDescInput.value.trim();
  
  if (!title) return alert('La receta necesita un título');
  
  const stepRows = DOM.recipeStepsContainer.querySelectorAll('.sf-step-input-row');
  const steps = [];
  
  stepRows.forEach(row => {
    const t = row.querySelector('.step-inp-title').value.trim();
    const d = row.querySelector('.step-inp-desc').value.trim();
    if (t) {
      steps.push({ id: uid(), title: t, desc: d });
    }
  });

  if (steps.length === 0) return alert('Debes agregar al menos un paso.');

  state.recipes.push({
    id: uid(),
    title,
    desc,
    steps
  });

  sfSave();
  closeModal();
  renderSidebar();
}

// ── Event Listeners ──
function setupEventListeners() {
  DOM.completeStepBtn.addEventListener('click', completeCurrentStep);
  DOM.newRecipeBtn.addEventListener('click', openModal);
  DOM.closeRecipeModal.addEventListener('click', closeModal);
  DOM.addStepInputBtn.addEventListener('click', addStepInput);
  DOM.saveRecipeBtn.addEventListener('click', saveRecipe);
}

// BOOT
init();
