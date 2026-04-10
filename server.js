require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// 🔥 FIX PROXY (Render)
app.set('trust proxy', 1);

// --- Seguridad ---
app.use(helmet());

// --- Middlewares ---
app.use(express.json({ limit: '10kb' }));
app.use(express.static('public'));
app.use('/imagenes', express.static('imagenes'));

// --- Rate limiting ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Demasiados intentos. Intenta en 15 minutos.' },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
});

app.use(generalLimiter);

// --- Sesiones ---
const sessions = new Map();

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

const SESSION_TTL = 8 * 60 * 60 * 1000;

// Limpieza de sesiones
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.loginTime > SESSION_TTL) {
      sessions.delete(id);
    }
  }
}, 60 * 60 * 1000);

// --- Auth middleware ---
function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const session = sessions.get(sessionId);

  if (Date.now() - session.loginTime > SESSION_TTL) {
    sessions.delete(sessionId);
    return res.status(401).json({ error: 'Sesión expirada' });
  }

  next();
}

// --- Credenciales ---
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vintage2026';

// --- LOGIN ---
app.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Datos inválidos' });
  }

  if (username.trim() === ADMIN_USER && password.trim() === ADMIN_PASSWORD) {
    const sessionId = generateSessionId();
    sessions.set(sessionId, { username: ADMIN_USER, loginTime: Date.now() });

    return res.json({ success: true, sessionId });
  }

  res.status(401).json({ success: false, error: 'Credenciales inválidas' });
});

// --- LOGOUT ---
app.post('/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) sessions.delete(sessionId);

  res.json({ success: true });
});

// --- CHECK AUTH ---
app.get('/check-auth', (req, res) => {
  const sessionId = req.headers['x-session-id'];

  if (sessionId && sessions.has(sessionId)) {
    return res.json({ authenticated: true });
  }

  res.json({ authenticated: false });
});

// --- BASE DE DATOS ---
const db = new sqlite3.Database('./database.sqlite');

// --- RUTA PRINCIPAL (FORZAR CACHE BREAK) ---
app.get('/', (req, res) => {
  res.send('Servidor funcionando 🚀 VERSION FINAL');
});

// --- ARRANQUE ---
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log("USER REAL:", ADMIN_USER);
  console.log("PASS REAL:", ADMIN_PASSWORD);
  console.log(`Servidor corriendo en puerto ${PORT}`);
});