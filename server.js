require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// --- Security headers ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.static('public'));
app.use('/imagenes', express.static('imagenes'));

// --- Rate limiting ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Demasiados intentos. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
});

app.use(generalLimiter);

// --- Session store ---
const sessions = new Map();

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

const SESSION_TTL = 8 * 60 * 60 * 1000;

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

// --- Credenciales admin ---
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vintage2026';

// --- Login ---
app.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Datos inválidos' });
  }

  const userMatch = username.trim() === ADMIN_USER;
  const passMatch = password.trim() === ADMIN_PASSWORD;

  if (userMatch && passMatch) {
    const sessionId = generateSessionId();
    sessions.set(sessionId, { username: ADMIN_USER, loginTime: Date.now() });
    return res.json({ success: true, sessionId });
  }

  res.status(401).json({ success: false, error: 'Credenciales inválidas' });
});

// --- Logout ---
app.post('/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) sessions.delete(sessionId);
  res.json({ success: true });
});

// --- Check auth ---
app.get('/check-auth', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    if (Date.now() - session.loginTime <= SESSION_TTL) {
      return res.json({ authenticated: true });
    }
    sessions.delete(sessionId);
  }
  res.json({ authenticated: false });
});