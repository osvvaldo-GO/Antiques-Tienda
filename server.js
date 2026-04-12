require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

// 🔥 FIX PROXY (Render)
app.set('trust proxy', 1);

// --- Seguridad ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  }
}));

// --- Cloudinary config ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Multer: subida de imágenes a Cloudinary ---
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'antiques-tienda',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1200, crop: 'limit' }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'));
  }
});

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

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.loginTime > SESSION_TTL) sessions.delete(id);
  }
}, 60 * 60 * 1000);

// --- Auth middleware ---
function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !sessions.has(sessionId))
    return res.status(401).json({ error: 'No autorizado' });

  const session = sessions.get(sessionId);
  if (Date.now() - session.loginTime > SESSION_TTL) {
    sessions.delete(sessionId);
    return res.status(401).json({ error: 'Sesión expirada' });
  }
  next();
}

// --- Credenciales ---
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

if (!ADMIN_USER || !ADMIN_PASSWORD_HASH) {
  console.error('ERROR FATAL: ADMIN_USER y ADMIN_PASSWORD_HASH deben estar definidos en .env');
  process.exit(1);
}

// ============================================================
// AUTH
// ============================================================

app.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, error: 'Datos inválidos' });

  const userMatch = username.trim() === ADMIN_USER;
  const passMatch = userMatch && await bcrypt.compare(password.trim(), ADMIN_PASSWORD_HASH);

  if (userMatch && passMatch) {
    const sessionId = generateSessionId();
    sessions.set(sessionId, { username: ADMIN_USER, loginTime: Date.now() });
    return res.json({ success: true, sessionId });
  }
  res.status(401).json({ success: false, error: 'Credenciales inválidas' });
});

app.post('/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) sessions.delete(sessionId);
  res.json({ success: true });
});

app.get('/check-auth', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  res.json({ authenticated: !!(sessionId && sessions.has(sessionId)) });
});

app.post('/generate-hash', async (req, res) => {
  const { password, emergency_token } = req.body;
  if (!emergency_token || emergency_token !== process.env.EMERGENCY_TOKEN)
    return res.status(403).json({ error: 'No autorizado' });
  if (!password || password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  const hash = await bcrypt.hash(password, 12);
  res.json({ hash, instruccion: 'Copia este hash y ponlo como ADMIN_PASSWORD_HASH en tu .env' });
});

// ============================================================
// BASE DE DATOS
// ============================================================

const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_inicial REAL NOT NULL,
    duracion INTEGER NOT NULL,
    fecha_inicio INTEGER NOT NULL,
    imagen TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS pujas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER,
    apodo TEXT,
    codigo TEXT,
    email TEXT,
    telefono TEXT,
    monto REAL,
    fecha INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT NOT NULL,
    precio_compra REAL NOT NULL,
    precio_venta REAL,
    estado TEXT DEFAULT 'disponible',
    imagen TEXT,
    fecha_ingreso INTEGER,
    fecha_venta INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transacciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventario_id INTEGER,
    tipo TEXT,
    monto REAL,
    descripcion TEXT,
    fecha INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS consultas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER,
    producto_nombre TEXT,
    categoria TEXT,
    nombre_cliente TEXT,
    email TEXT,
    telefono TEXT,
    mensaje TEXT,
    fecha INTEGER,
    estado TEXT DEFAULT 'pendiente'
  )`);
});

// ============================================================
// SUBIDA DE IMÁGENES
// ============================================================

app.post('/upload-imagen', requireAuth, upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  res.json({ url: req.file.path });
});

// ============================================================
// SUBASTAS
// ============================================================

app.get('/productos', (req, res) => {
  db.all('SELECT * FROM productos ORDER BY fecha_inicio DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/subir-producto', requireAuth, (req, res) => {
  const { nombre, descripcion, precio_inicial, duracion, imagen } = req.body;
  if (!nombre || !precio_inicial || !duracion)
    return res.status(400).json({ error: 'Faltan datos requeridos' });

  db.run(
    'INSERT INTO productos (nombre, descripcion, precio_inicial, duracion, fecha_inicio, imagen) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, descripcion, precio_inicial, duracion, Date.now(), imagen || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.delete('/producto/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM productos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============================================================
// PUJAS
// ============================================================

app.post('/pujar', (req, res) => {
  const { producto_id, apodo, email, telefono, monto } = req.body;
  if (!producto_id || !apodo || !email || !monto)
    return res.status(400).json({ error: 'Faltan datos' });

  const codigo = 'BID' + crypto.randomBytes(4).toString('hex').toUpperCase();
  db.run(
    'INSERT INTO pujas (producto_id, apodo, codigo, email, telefono, monto, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [producto_id, apodo, codigo, email, telefono, monto, Date.now()],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, codigo });
    }
  );
});

app.get('/historial/:id', (req, res) => {
  db.all('SELECT * FROM pujas WHERE producto_id = ? ORDER BY monto DESC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/borrar-historial', requireAuth, (req, res) => {
  const { producto_id } = req.body;
  db.run('DELETE FROM pujas WHERE producto_id = ?', [producto_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============================================================
// INVENTARIO
// ============================================================

app.get('/inventario', (req, res) => {
  const { categoria } = req.query;
  const sessionId = req.headers['x-session-id'];
  const isAdmin = sessionId && sessions.has(sessionId);

  let query = 'SELECT * FROM inventario';
  const params = [];

  if (categoria) {
    query += ' WHERE categoria = ?';
    params.push(categoria);
  }

  // Público solo ve disponibles y reservados
  if (!isAdmin) {
    query += categoria ? ' AND estado != ?' : ' WHERE estado != ?';
    params.push('vendido');
  }

  query += ' ORDER BY fecha_ingreso DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Ocultar precio_compra al público
    if (!isAdmin) {
      rows = rows.map(({ precio_compra, ...rest }) => rest);
    }
    res.json(rows);
  });
});

app.post('/inventario', requireAuth, (req, res) => {
  const { nombre, descripcion, categoria, precio_compra, precio_venta, estado, imagen } = req.body;
  if (!nombre || !categoria || !precio_compra)
    return res.status(400).json({ error: 'Faltan datos requeridos' });

  const fecha_ingreso = Date.now();
  db.run(
    'INSERT INTO inventario (nombre, descripcion, categoria, precio_compra, precio_venta, estado, imagen, fecha_ingreso) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nombre, descripcion, categoria, precio_compra, precio_venta || null, estado || 'disponible', imagen || '', fecha_ingreso],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      db.run(
        'INSERT INTO transacciones (inventario_id, tipo, monto, descripcion, fecha) VALUES (?, ?, ?, ?, ?)',
        [this.lastID, 'compra', precio_compra, `Compra: ${nombre}`, fecha_ingreso]
      );
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.put('/inventario/:id', requireAuth, (req, res) => {
  const { estado, precio_venta } = req.body;
  const fecha_venta = estado === 'vendido' ? Date.now() : null;

  db.run(
    'UPDATE inventario SET estado = ?, precio_venta = ?, fecha_venta = ? WHERE id = ?',
    [estado, precio_venta || null, fecha_venta, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      if (estado === 'vendido' && precio_venta) {
        db.get('SELECT nombre FROM inventario WHERE id = ?', [req.params.id], (err, row) => {
          if (row) {
            db.run(
              'INSERT INTO transacciones (inventario_id, tipo, monto, descripcion, fecha) VALUES (?, ?, ?, ?, ?)',
              [req.params.id, 'venta', precio_venta, `Venta: ${row.nombre}`, fecha_venta]
            );
          }
        });
      }
      res.json({ success: true });
    }
  );
});

app.delete('/inventario/:id', requireAuth, (req, res) => {
  db.get('SELECT imagen FROM inventario WHERE id = ?', [req.params.id], (err, row) => {
    // Borrar imagen en Cloudinary si existe
    if (row && row.imagen && row.imagen.includes('cloudinary.com')) {
      const parts = row.imagen.split('/');
      const filename = parts[parts.length - 1].split('.')[0];
      const publicId = 'antiques-tienda/' + filename;
      cloudinary.uploader.destroy(publicId).catch(() => {});
    }
    // Compatibilidad con imágenes locales antiguas
    if (row && row.imagen && row.imagen.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, 'public', row.imagen);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    db.run('DELETE FROM inventario WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// ============================================================
// ESTADÍSTICAS
// ============================================================

app.get('/estadisticas', requireAuth, (req, res) => {
  const stats = {};

  db.get('SELECT COALESCE(SUM(monto),0) as total FROM transacciones WHERE tipo = ?', ['compra'], (err, row) => {
    stats.totalCompras = row?.total || 0;

    db.get('SELECT COALESCE(SUM(monto),0) as total FROM transacciones WHERE tipo = ?', ['venta'], (err, row) => {
      stats.totalVentas = row?.total || 0;
      stats.ganancia = stats.totalVentas - stats.totalCompras;

      db.get('SELECT COUNT(*) as c FROM inventario WHERE estado = ?', ['disponible'], (err, row) => {
        stats.productosDisponibles = row?.c || 0;

        db.get('SELECT COUNT(*) as c FROM inventario WHERE estado = ?', ['vendido'], (err, row) => {
          stats.productosVendidos = row?.c || 0;

          db.all('SELECT categoria, estado, COUNT(*) as cantidad FROM inventario GROUP BY categoria, estado', [], (err, rows) => {
            stats.inventarioPorCategoria = rows || [];
            res.json(stats);
          });
        });
      });
    });
  });
});

// ============================================================
// CONSULTAS
// ============================================================

app.post('/consulta', (req, res) => {
  const { producto_id, producto_nombre, categoria, nombre_cliente, email, telefono, mensaje } = req.body;
  if (!nombre_cliente || !email)
    return res.status(400).json({ error: 'Faltan datos' });

  db.run(
    'INSERT INTO consultas (producto_id, producto_nombre, categoria, nombre_cliente, email, telefono, mensaje, fecha, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [producto_id, producto_nombre, categoria, nombre_cliente, email, telefono, mensaje, Date.now(), 'pendiente'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.get('/consultas', requireAuth, (req, res) => {
  db.all('SELECT * FROM consultas ORDER BY fecha DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/consulta/:id', requireAuth, (req, res) => {
  const { estado } = req.body;
  db.run('UPDATE consultas SET estado = ? WHERE id = ?', [estado, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============================================================
// ARRANQUE
// ============================================================

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
