/**
 * AUTH-APP.JS — Sistema de Autenticación, Perfiles Multi-Usuario y Sincronización en la Nube
 * Permite registro e inicio de sesión por correo electrónico,
 * aislamiento de datos por usuario y sincronización con Supabase (Nube).
 */

const ExecuteAuth = (function() {
  // Configuración predeterminada de Supabase
  let SUPABASE_URL = localStorage.getItem('execute_supabase_url') || '';
  let SUPABASE_ANON_KEY = localStorage.getItem('execute_supabase_key') || '';
  let supabase = null;

  // Claves de datos del ecosistema Execute
  const APP_DATA_KEYS = {
    habitos: 'habitos_gadzhi_v2',
    vitaltrack: 'vitaltrack_v1',
    finanzas: 'gadzhi_finanzas_data',
    flowstate: 'flowstate_v1',
    notes: 'habitos_notes'
  };

  // Inicializar cliente Supabase si hay credenciales válidas
  function getSupabaseClient() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    if (SUPABASE_URL.includes('vaqmhhiwejcsfeentead')) return null; // Evitar URL ficticia anterior

    if (window.supabase && !supabase) {
      try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } catch (e) {
        console.warn('Execute Auth: Error iniciando Supabase', e);
        supabase = null;
      }
    }
    return supabase;
  }

  // Obtener usuario activo actual
  function getCurrentUser() {
    return localStorage.getItem('execute_current_user') || null;
  }

  // Validar formato de correo (flexible para cualquier proveedor)
  function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const clean = email.trim().toLowerCase();
    return clean.includes('@') && clean.includes('.');
  }

  // Empaquetar todos los datos locales actuales
  function packCurrentUserData() {
    const data = {};
    for (const [key, storageKey] of Object.entries(APP_DATA_KEYS)) {
      data[key] = localStorage.getItem(storageKey) || null;
    }
    data.updatedAt = new Date().toISOString();
    return data;
  }

  // Desempaquetar datos en el localStorage activo
  function unpackUserData(userData) {
    if (!userData) return;
    for (const [key, storageKey] of Object.entries(APP_DATA_KEYS)) {
      if (userData[key] !== undefined && userData[key] !== null) {
        localStorage.setItem(storageKey, userData[key]);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }

  // Guardar datos del usuario en su almacén local independiente
  function saveUserDataLocally(email, data) {
    if (!email) return;
    const userStoreKey = `execute_userdata_${email.toLowerCase().trim()}`;
    const toSave = data || packCurrentUserData();
    localStorage.setItem(userStoreKey, JSON.stringify(toSave));
    localStorage.setItem('execute_last_saved', new Date().toISOString());
  }

  // Cargar datos locales del usuario
  function loadUserDataLocally(email) {
    if (!email) return null;
    const userStoreKey = `execute_userdata_${email.toLowerCase().trim()}`;
    const raw = localStorage.getItem(userStoreKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // Sincronizar hacia la nube (Push)
  async function syncLocalToRemote(email) {
    const client = getSupabaseClient();
    if (!client || !email) return false;

    try {
      const allData = packCurrentUserData();
      const { error } = await client
        .from('user_profiles')
        .upsert({
          email: email.toLowerCase().trim(),
          data: allData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' });

      if (error) {
        console.warn('Execute Cloud Push:', error.message);
        return false;
      }
      console.log('Execute Cloud: Datos subidos exitosamente a la nube.');
      updateCloudStatusUI('synced');
      return true;
    } catch (err) {
      console.warn('Execute Cloud Push Error:', err);
      updateCloudStatusUI('error');
      return false;
    }
  }

  // Sincronizar desde la nube (Pull)
  async function syncRemoteToLocal(email) {
    const client = getSupabaseClient();
    if (!client || !email) return false;

    try {
      updateCloudStatusUI('syncing');
      const { data, error } = await client
        .from('user_profiles')
        .select('data, updated_at')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Execute Cloud Pull:', error.message);
        updateCloudStatusUI('error');
        return false;
      }

      if (data && data.data) {
        console.log('Execute Cloud: Datos descargados de la nube.');
        unpackUserData(data.data);
        saveUserDataLocally(email, data.data);
        updateCloudStatusUI('synced');
        return true;
      } else {
        // Primera vez en la nube para este correo: subir datos locales actuales
        console.log('Execute Cloud: Creando registro inicial en la nube.');
        await syncLocalToRemote(email);
        return true;
      }
    } catch (err) {
      console.warn('Execute Cloud Pull Error:', err);
      updateCloudStatusUI('error');
      return false;
    }
  }

  // Iniciar Sesión / Registro con Correo
  async function login(email, password = '') {
    email = (email || '').trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      alert('❌ Por favor escribe tu correo electrónico (ejemplo: tunombre@gmail.com).');
      return false;
    }

    const prevUser = getCurrentUser();
    // Respaldar datos del usuario previo si era distinto
    if (prevUser && prevUser !== email) {
      saveUserDataLocally(prevUser);
    }

    // Establecer nuevo usuario activo
    localStorage.setItem('execute_current_user', email);
    localStorage.setItem('nodu_last_email', email);

    // Cargar datos previos de este correo si existen en este equipo
    const localSavedData = loadUserDataLocally(email);
    if (localSavedData) {
      unpackUserData(localSavedData);
    } else {
      // Si es un usuario nuevo en este dispositivo, asegurar que sus datos se guarden
      saveUserDataLocally(email);
    }

    // Intentar sincronizar con la nube si Supabase está disponible
    const client = getSupabaseClient();
    if (client) {
      try {
        await syncRemoteToLocal(email);
      } catch (e) {
        console.warn('Error en sincronización inicial:', e);
      }
    }

    // Actualizar interfaz
    updateUI();
    alert('✅ ¡Sesión iniciada con éxito con tu correo:\n' + email + '\n\nTodos tus datos se guardarán bajo tu cuenta.');
    return true;
  }

  // Cambiar Correo Rápidamente
  function promptChangeEmail() {
    const current = getCurrentUser() || '';
    const newEmail = prompt('Escribe el correo electrónico que deseas usar:', current);
    if (newEmail && newEmail.trim() && newEmail.trim().toLowerCase() !== current.toLowerCase()) {
      login(newEmail);
    }
  }

  // Cerrar Sesión
  function logout() {
    const currentUser = getCurrentUser();
    if (currentUser) {
      saveUserDataLocally(currentUser);
    }
    localStorage.removeItem('execute_current_user');
    updateUI();
  }

  // Actualizar estado de la nube en la UI
  function updateCloudStatusUI(status) {
    const badge = document.getElementById('ndCloudStatusBadge');
    if (!badge) return;

    const hasCloud = !!getSupabaseClient();
    if (!hasCloud) {
      badge.innerHTML = `<span style="display:inline-flex; align-items:center; gap:5px; font-size:0.75rem; color:#94a3b8; background:rgba(255,255,255,0.06); padding:4px 10px; border-radius:20px; cursor:pointer;" onclick="ExecuteAuth.openCloudModal()" title="Haz clic para activar sincronización con tu celular">💾 Guardado Local (Haz clic para activar Nube)</span>`;
      return;
    }

    if (status === 'syncing') {
      badge.innerHTML = `<span style="display:inline-flex; align-items:center; gap:5px; font-size:0.75rem; color:#f1c40f; background:rgba(241,196,15,0.1); padding:4px 10px; border-radius:20px;">🔄 Sincronizando con la nube...</span>`;
    } else if (status === 'synced') {
      badge.innerHTML = `<span style="display:inline-flex; align-items:center; gap:5px; font-size:0.75rem; color:#10b981; background:rgba(16,185,129,0.1); padding:4px 10px; border-radius:20px; cursor:pointer;" onclick="ExecuteAuth.openCloudModal()" title="Conectado a la nube">☁️ Nube Conectada</span>`;
    } else if (status === 'error') {
      badge.innerHTML = `<span style="display:inline-flex; align-items:center; gap:5px; font-size:0.75rem; color:#ef4444; background:rgba(239,68,68,0.1); padding:4px 10px; border-radius:20px; cursor:pointer;" onclick="ExecuteAuth.openCloudModal()">⚠️ Error de conexión a la nube</span>`;
    }
  }

  // Actualizar la interfaz (Gatekeeper vs App)
  function updateUI() {
    const user = getCurrentUser();
    const gatekeeper = document.getElementById('ndGatekeeper');
    const mainApp = document.getElementById('ndMainApp');
    const authContainer = document.getElementById('ndAuthContainer');

    if (user) {
      // Usuario autenticado: ocultar gatekeeper y mostrar la app
      if (gatekeeper) gatekeeper.style.display = 'none';
      if (mainApp) {
        mainApp.style.display = 'flex';
        mainApp.style.opacity = '1';
      }
      document.body.style.overflow = 'auto';

      // Renderizar barra de usuario en la cabecera
      if (authContainer) {
        authContainer.innerHTML = `
          <div class="nd-user-bar" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; background:rgba(255,255,255,0.04); border:1px solid rgba(241,196,15,0.25); padding:6px 14px; border-radius:30px; margin-top:8px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:1.1rem;">👤</span>
              <span style="font-size:0.9rem; font-weight:700; color:#f1c40f;" id="ndUserEmailDisplay">${user}</span>
            </div>
            <div id="ndCloudStatusBadge"></div>
            <button onclick="ExecuteAuth.promptChangeEmail()" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; font-size:0.75rem; font-weight:700; cursor:pointer; padding:4px 10px; border-radius:14px; transition:all 0.2s;" onmouseover="this.style.color='#f1c40f'; this.style.borderColor='#f1c40f';" onmouseout="this.style.color='#cbd5e1'; this.style.borderColor='rgba(255,255,255,0.15)';">
              🔄 Cambiar de Correo
            </button>
            <button onclick="ExecuteAuth.logout()" style="background:transparent; border:none; color:#ef4444; font-size:0.75rem; font-weight:700; cursor:pointer; padding:4px 8px; border-radius:6px; transition:background 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='transparent'">
              Cerrar sesión
            </button>
          </div>
        `;
      }
      updateCloudStatusUI('synced');
    } else {
      // Sin sesión: bloquear la app y obligar a iniciar con correo
      if (gatekeeper) gatekeeper.style.display = 'flex';
      if (mainApp) mainApp.style.display = 'none';
      document.body.style.overflow = 'hidden';

      const lastEmail = localStorage.getItem('nodu_last_email') || '';
      const emailInput = document.getElementById('ndAuthEmail');
      if (emailInput) {
        emailInput.value = lastEmail;
        emailInput.focus();
        emailInput.select();
      }
    }
  }

  // Notificar a módulos y guardar
  function saveAndSync() {
    const user = getCurrentUser();
    if (!user) return;
    saveUserDataLocally(user);
    syncLocalToRemote(user);
  }

  // Modal para configurar la base de datos Supabase
  function openCloudModal() {
    let modal = document.getElementById('ndCloudModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ndCloudModal';
      modal.className = 'auth-gatekeeper-overlay';
      modal.innerHTML = `
        <div class="auth-card" style="max-width:500px;">
          <div class="auth-logo">
            <span class="auth-icon">☁️</span>
            <h2 class="auth-title">Conectar Sincronización en la Nube</h2>
            <p class="auth-sub">Conecta tu propia base de datos gratuita de Supabase para que tus datos se sincronicen entre tu Computadora y tu Celular automáticamente.</p>
          </div>
          <div class="auth-form" style="gap:14px;">
            <div class="auth-field">
              <label for="cfgSupabaseUrl">Project URL de Supabase</label>
              <input type="text" id="cfgSupabaseUrl" placeholder="https://tunombre.supabase.co" class="auth-input" value="${localStorage.getItem('execute_supabase_url') || ''}" />
            </div>
            <div class="auth-field">
              <label for="cfgSupabaseKey">Anon / Public API Key</label>
              <input type="password" id="cfgSupabaseKey" placeholder="eyJhbGciOiJIUzI1NiIsIn..." class="auth-input" value="${localStorage.getItem('execute_supabase_key') || ''}" />
            </div>
            <button class="btn-primary-auth" onclick="ExecuteAuth.saveCloudConfig()">
              💾 Guardar y Conectar Nube
            </button>
            <div style="font-size:0.75rem; color:#94a3b8; line-height:1.4; margin-top:6px; background:rgba(255,255,255,0.03); padding:10px; border-radius:8px;">
              <strong>¿Cómo obtener tu nube gratis en 2 minutos?</strong><br>
              1. Ve a <a href="https://supabase.com" target="_blank" style="color:#f1c40f; text-decoration:underline;">supabase.com</a> y crea una cuenta gratuita.<br>
              2. Crea un nuevo proyecto (ej. "Execute").<br>
              3. En Project Settings -> API, copia la URL y la Anon Key y pégalas aquí.
            </div>
            <button class="btn-guest-auth" onclick="document.getElementById('ndCloudModal').style.display='none'">
              Cerrar
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
  }

  function saveCloudConfig() {
    const url = (document.getElementById('cfgSupabaseUrl').value || '').trim();
    const key = (document.getElementById('cfgSupabaseKey').value || '').trim();

    if (url) localStorage.setItem('execute_supabase_url', url);
    else localStorage.removeItem('execute_supabase_url');

    if (key) localStorage.setItem('execute_supabase_key', key);
    else localStorage.removeItem('execute_supabase_key');

    SUPABASE_URL = url;
    SUPABASE_ANON_KEY = key;
    supabase = null; // Reiniciar cliente

    alert('✅ Configuración de nube guardada.');
    document.getElementById('ndCloudModal').style.display = 'none';

    const user = getCurrentUser();
    if (user) {
      syncRemoteToLocal(user);
    }
  }

  // Inicialización al cargar la página
  function init() {
    updateUI();

    // Si ya hay usuario y cliente de supabase, sincronizar en segundo plano
    const user = getCurrentUser();
    if (user && getSupabaseClient()) {
      syncRemoteToLocal(user);
    }
  }

  return {
    init,
    login,
    logout,
    promptChangeEmail,
    getCurrentUser,
    saveAndSync,
    syncLocalToRemote,
    syncRemoteToLocal,
    openCloudModal,
    saveCloudConfig,
    updateUI
  };
})();

// Compatibilidad con los botones del HTML
function handleFrictionlessLogin() {
  const emailInput = document.getElementById('ndAuthEmail');
  const email = emailInput ? emailInput.value.trim() : '';
  const passInput = document.getElementById('ndAuthPass');
  const pass = passInput ? passInput.value.trim() : '';
  ExecuteAuth.login(email, pass);
}

function enterAsGuest() {
  ExecuteAuth.login('invitado@execute.local');
}

window.ExecuteAuth = ExecuteAuth;
window.handleFrictionlessLogin = handleFrictionlessLogin;
window.enterAsGuest = enterAsGuest;
window.logout = () => ExecuteAuth.logout();
window.syncLocalToRemote = (userId) => ExecuteAuth.saveAndSync();

document.addEventListener('DOMContentLoaded', () => {
  ExecuteAuth.init();
});
