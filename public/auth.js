// Store original fetch before overriding
const originalFetch = window.fetch;

let sessionId = localStorage.getItem('sessionId');
let isAuthenticated = false;

// Check authentication on page load
async function checkAuth() {
  if (!sessionId) {
    updateUIForGuest();
    return;
  }

  try {
    const response = await originalFetch('/check-auth', {
      headers: { 'x-session-id': sessionId }
    });
    const data = await response.json();
    
    if (data.authenticated) {
      isAuthenticated = true;
      updateUIForAdmin();
    } else {
      isAuthenticated = false;
      sessionId = null;
      localStorage.removeItem('sessionId');
      updateUIForGuest();
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    updateUIForGuest();
  }
}

function updateUIForAdmin() {
  // Show admin elements
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = '';
  });
  
  // Show logout button, hide login button
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('logoutBtn').style.display = '';
  
  // Show contabilidad button
  document.querySelector('[data-section="contabilidad"]').style.display = '';
  
  // Show consultas button
  document.querySelector('[data-section="consultas"]').style.display = '';
}

function updateUIForGuest() {
  // Hide admin elements
  document.querySelectorAll('.admin-only').forEach(el => {
    if (el.id !== 'loginBtn') {
      el.style.display = 'none';
    }
  });
  
  // Show login button, hide logout button
  document.getElementById('loginBtn').style.display = '';
  document.getElementById('logoutBtn').style.display = 'none';
  
  // Hide contabilidad button
  const contabilidadBtn = document.querySelector('[data-section="contabilidad"]');
  if (contabilidadBtn) {
    contabilidadBtn.style.display = 'none';
  }
  
  // Hide consultas button
  const consultasBtn = document.querySelector('[data-section="consultas"]');
  if (consultasBtn) {
    consultasBtn.style.display = 'none';
  }
}

// Login button handler
document.getElementById('loginBtn').addEventListener('click', () => {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = `
    <h2>Admin Login</h2>
    <form id="loginForm" class="bid-form">
      <input type="text" id="username" placeholder="Username" required autocomplete="username" value="admin">
      <input type="password" id="password" placeholder="Password" required autocomplete="current-password" value="vintage2026">
      <button type="submit">Login</button>
    </form>
    <p style="margin-top: 15px; color: #666; font-size: 0.9em;">
      Default credentials:<br>
      Username: <strong>admin</strong><br>
      Password: <strong>vintage2026</strong>
    </p>
  `;
  
  modal.style.display = 'block';
  
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin();
  });
});

// Logout button handler
document.getElementById('logoutBtn').addEventListener('click', async () => {
  if (!confirm('Are you sure you want to logout?')) return;
  
  try {
    await originalFetch('/logout', {
      method: 'POST',
      headers: { 'x-session-id': sessionId }
    });
    
    sessionId = null;
    isAuthenticated = false;
    localStorage.removeItem('sessionId');
    updateUIForGuest();
    
    // Redirect to auctions
    document.querySelector('[data-section="auctions"]').click();
    
    alert('Logged out successfully');
  } catch (error) {
    console.error('Error logging out:', error);
  }
});

async function handleLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  
  console.log('Attempting login...');
  console.log('Username:', username);
  console.log('Password:', password);
  
  try {
    const response = await originalFetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.success) {
      sessionId = data.sessionId;
      isAuthenticated = true;
      localStorage.setItem('sessionId', sessionId);
      updateUIForAdmin();
      closeModal();
      alert('Login successful!');
    } else {
      alert('Invalid credentials. Please try again.');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    alert('Error logging in: ' + error.message);
  }
}

// Override fetch to add session ID to requests (except login)
window.fetch = function(url, options = {}) {
  // Don't add session to login request
  if (url === '/login') {
    return originalFetch.apply(this, [url, options]);
  }
  
  if (sessionId) {
    options.headers = {
      ...options.headers,
      'x-session-id': sessionId
    };
  }
  return originalFetch.apply(this, [url, options]);
};

// Check auth on page load
checkAuth();
