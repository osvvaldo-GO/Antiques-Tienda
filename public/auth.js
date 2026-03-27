const originalFetch = window.fetch;

let sessionId = localStorage.getItem('sessionId');
let isAuthenticated = false;

// --- Verificar sesión al cargar la página ---
async function checkAuth() {
  if (!sessionId) {
    updateUIForGuest();
    return;
  }
  try {
    const res = await originalFetch('/check-auth', {
      headers: { 'x-session-id': sessionId }
    });
    const data = await res.json();
    if (data.authenticated) {
      isAuthenticated = true;
      updateUIForAdmin();
    } else {
      clearSession();
    }
  } catch {
    clearSession();
  }
}

function clearSession() {
  sessionId = null;
  isAuthenticated = false;
  localStorage.removeItem('sessionId');
  updateUIForGuest();
}

// --- UI para admin ---
function updateUIForAdmin() {
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('logoutBtn').style.display = '';
  const contBtn = document.querySelector('[data-section="contabilidad"]');
  const consBtn = document.querySelector('[data-section="consultas"]');
  if (contBtn) contBtn.style.display = '';
  if (consBtn) consBtn.style.display = '';
}

// --- UI para visitante ---
function updateUIForGuest() {
  document.querySelectorAll('.admin-only').forEach(el => {
    if (el.id !== 'loginBtn') el.style.display = 'none';
  });
  document.getElementById('loginBtn').style.display = '';
  document.getElementById('logoutBtn').style.display = 'none';
  const contBtn = document.querySelector('[data-section="contabilidad"]');
  const consBtn = document.querySelector('[data-section="consultas"]');
  if (contBtn) contBtn.style.display = 'none';
  if (consBtn) consBtn.style.display = 'none';
}

// --- Abrir modal de login ---
document.getElementById('loginBtn').addEventListener('click', () => {
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = `
    <h2>Inicio de sesión</h2>
    <form id="loginForm" class="bid-form" autocomplete="off">
      <input type="text" id="loginUsername" placeholder="Usuario" required autocomplete="off">
      <input type="password" id="loginPassword" placeholder="Contraseña" required autocomplete="new-password">
      <button type="submit">Entrar</button>
      <p id="loginError" style="color:red; display:none; margin-top:10px;"></p>
    </form>
  `;
  // Limpiar campos por si el navegador los rellena de todas formas
  setTimeout(() => {
    const u = document.getElementById('loginUsername');
    const p = document.getElementById('loginPassword');
    if (u) u.value = '';
    if (p) p.value = '';
  }, 50);
  document.getElementById('modal').style.display = 'block';
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin();
  });
});

// --- Manejar login ---
async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorEl = document.getElementById('loginError');

  if (!username || !password) {
    errorEl.textContent = 'Completa todos los campos.';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const res = await originalFetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      sessionId = data.sessionId;
      isAuthenticated = true;
      localStorage.setItem('sessionId', sessionId);
      updateUIForAdmin();
      document.getElementById('modal').style.display = 'none';
    } else {
      errorEl.textContent = data.error || 'Credenciales inválidas.';
      errorEl.style.display = 'block';
    }
  } catch {
    errorEl.textContent = 'Error de conexión. Intenta de nuevo.';
    errorEl.style.display = 'block';
  }
}

// --- Logout ---
document.getElementById('logoutBtn').addEventListener('click', async () => {
  if (!confirm('¿Cerrar sesión?')) return;
  try {
    await originalFetch('/logout', {
      method: 'POST',
      headers: { 'x-session-id': sessionId }
    });
  } catch { /* ignorar error de red */ }
  clearSession();
  document.querySelector('[data-section="auctions"]').click();
});

// --- Interceptar fetch para añadir session ID automáticamente ---
window.fetch = function(url, options = {}) {
  if (url === '/login') return originalFetch(url, options);
  if (sessionId) {
    options.headers = { ...options.headers, 'x-session-id': sessionId };
  }
  return originalFetch(url, options);
};

// --- Iniciar ---
checkAuth();
