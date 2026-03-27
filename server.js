require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
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
  windowMs: 15 * 60 * 1000, // 15 minutos
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

// Limpiar sesiones expiradas cada hora (sesiones duran 8 horas)
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

// --- Credenciales admin desde variables de entorno ---
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
let ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

console.log('ADMIN_USER cargado:', ADMIN_USER);
console.log('ADMIN_PASSWORD_HASH cargado:', ADMIN_PASSWORD_HASH ? 'SI (longitud: ' + ADMIN_PASSWORD_HASH.length + ')' : 'NO - usando fallback');

if (!ADMIN_PASSWORD_HASH) {
  const defaultPass = process.env.ADMIN_PASSWORD || 'vintage2026';
  ADMIN_PASSWORD_HASH = bcrypt.hashSync(defaultPass, 12);
  console.warn('⚠️  Usando contraseña por defecto. Define ADMIN_PASSWORD_HASH en .env');
}

// --- Login ---
app.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Datos inválidos' });
  }

  const userMatch = username.trim() === ADMIN_USER;
  const passMatch = await bcrypt.compare(password.trim(), ADMIN_PASSWORD_HASH);

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


// --- Base de datos ---
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
    producto_id INTEGER NOT NULL,
    apodo TEXT NOT NULL,
    codigo TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT NOT NULL,
    monto REAL NOT NULL,
    fecha INTEGER NOT NULL,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT NOT NULL,
    precio_compra REAL NOT NULL,
    precio_venta REAL,
    estado TEXT NOT NULL,
    imagen TEXT,
    fecha_ingreso INTEGER NOT NULL,
    fecha_venta INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transacciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventario_id INTEGER,
    tipo TEXT NOT NULL,
    monto REAL NOT NULL,
    descripcion TEXT,
    fecha INTEGER NOT NULL,
    FOREIGN KEY (inventario_id) REFERENCES inventario(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS consultas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    producto_nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    nombre_cliente TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT NOT NULL,
    mensaje TEXT,
    fecha INTEGER NOT NULL,
    estado TEXT DEFAULT 'pendiente'
  )`);
});

// --- Helpers de validación ---
function sanitizeText(val, maxLen = 500) {
  if (typeof val !== 'string') return '';
  return val.trim().substring(0, maxLen);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- Rutas de productos ---
app.get('/productos', (req, res) => {
  db.all('SELECT * FROM productos ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    res.json(rows);
  });
});

app.post('/subir-producto', requireAuth, (req, res) => {
  const nombre = sanitizeText(req.body.nombre, 200);
  const descripcion = sanitizeText(req.body.descripcion, 1000);
  const precio_inicial = parseFloat(req.body.precio_inicial);
  const duracion = parseInt(req.body.duracion);
  const imagen = sanitizeText(req.body.imagen, 500);

  if (!nombre || isNaN(precio_inicial) || precio_inicial <= 0 || isNaN(duracion) || duracion <= 0) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const fecha_inicio = Date.now();
  db.run(
    'INSERT INTO productos (nombre, descripcion, precio_inicial, duracion, fecha_inicio, imagen) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, descripcion, precio_inicial, duracion, fecha_inicio, imagen],
    function(err) {
      if (err) return res.status(500).json({ error: 'Error interno' });
      res.json({ id: this.lastID, success: true });
    }
  );
});

app.post('/pujar', (req, res) => {
  const producto_id = parseInt(req.body.producto_id);
  const apodo = sanitizeText(req.body.apodo, 100);
  const email = sanitizeText(req.body.email, 200);
  const telefono = sanitizeText(req.body.telefono, 30);
  const monto = parseFloat(req.body.monto);

  if (!producto_id || !apodo || !email || !isValidEmail(email) || isNaN(monto) || monto <= 0) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const codigo = 'BID' + crypto.randomBytes(5).toString('hex').toUpperCase();
  const fecha = Date.now();

  db.run(
    'INSERT INTO pujas (producto_id, apodo, codigo, email, telefono, monto, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [producto_id, apodo, codigo, email, telefono, monto, fecha],
    function(err) {
      if (err) return res.status(500).json({ error: 'Error interno' });
      res.json({ id: this.lastID, codigo, success: true });
    }
  );
});

app.get('/historial/:id', (req, res) => {
  const producto_id = parseInt(req.params.id);
  if (!producto_id) return res.status(400).json({ error: 'ID inválido' });

  db.all(
    'SELECT apodo, codigo, monto, fecha FROM pujas WHERE producto_id = ? ORDER BY monto DESC, fecha DESC',
    [producto_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error interno' });
      res.json(rows);
    }
  );
});

app.post('/borrar-historial', requireAuth, (req, res) => {
  const producto_id = parseInt(req.body.producto_id);
  if (!producto_id) return res.status(400).json({ error: 'ID inválido' });

  db.run('DELETE FROM pujas WHERE producto_id = ?', [producto_id], (err) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    res.json({ success: true });
  });
});

app.delete('/producto/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  db.run('DELETE FROM productos WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    db.run('DELETE FROM pujas WHERE producto_id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: 'Error interno' });
      res.json({ success: true });
    });
  });
});


// --- Inventario ---
app.get('/inventario', (req, res) => {
  const categoria = req.query.categoria;
  const isAdmin = req.headers['x-session-id'] && sessions.has(req.headers['x-session-id']);

  let query = 'SELECT * FROM inventario WHERE estado != "vendido"';
  const params = [];

  if (categoria && categoria !== 'all') {
    query += ' AND categoria = ?';
    params.push(sanitizeText(categoria, 50));
  }
  query += ' ORDER BY fecha_ingreso DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error interno' });

    if (!isAdmin) {
      rows = rows.map(item => ({
        id: item.id,
        nombre: item.nombre,
        descripcion: item.descripcion,
        categoria: item.categoria,
        precio_venta: item.precio_venta,
        estado: item.estado,
        imagen: item.imagen,
        fecha_ingreso: item.fecha_ingreso
      }));
    }
    res.json(rows);
  });
});

app.post('/inventario', requireAuth, (req, res) => {
  const nombre = sanitizeText(req.body.nombre, 200);
  const descripcion = sanitizeText(req.body.descripcion, 1000);
  const categoria = sanitizeText(req.body.categoria, 50);
  const precio_compra = parseFloat(req.body.precio_compra);
  const precio_venta = parseFloat(req.body.precio_venta) || null;
  const estado = sanitizeText(req.body.estado, 20);
  const imagen = sanitizeText(req.body.imagen, 500);

  const estadosValidos = ['disponible', 'vendido', 'reservado'];
  if (!nombre || !categoria || isNaN(precio_compra) || precio_compra <= 0 || !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const fecha_ingreso = Date.now();
  db.run(
    'INSERT INTO inventario (nombre, descripcion, categoria, precio_compra, precio_venta, estado, imagen, fecha_ingreso) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nombre, descripcion, categoria, precio_compra, precio_venta, estado, imagen, fecha_ingreso],
    function(err) {
      if (err) return res.status(500).json({ error: 'Error interno' });
      db.run(
        'INSERT INTO transacciones (inventario_id, tipo, monto, descripcion, fecha) VALUES (?, ?, ?, ?, ?)',
        [this.lastID, 'compra', precio_compra, `Compra: ${nombre}`, fecha_ingreso]
      );
      res.json({ id: this.lastID, success: true });
    }
  );
});

app.put('/inventario/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const estado = sanitizeText(req.body.estado, 20);
  const precio_venta = parseFloat(req.body.precio_venta) || null;

  const estadosValidos = ['disponible', 'vendido', 'reservado'];
  if (!id || !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const fecha_venta = estado === 'vendido' ? Date.now() : null;

  db.get('SELECT * FROM inventario WHERE id = ?', [id], (err, item) => {
    if (err || !item) return res.status(404).json({ error: 'Item no encontrado' });

    db.run(
      'UPDATE inventario SET estado = ?, precio_venta = ?, fecha_venta = ? WHERE id = ?',
      [estado, precio_venta, fecha_venta, id],
      (err) => {
        if (err) return res.status(500).json({ error: 'Error interno' });
        if (estado === 'vendido') {
          db.run(
            'INSERT INTO transacciones (inventario_id, tipo, monto, descripcion, fecha) VALUES (?, ?, ?, ?, ?)',
            [id, 'venta', precio_venta, `Venta: ${item.nombre}`, fecha_venta]
          );
        }
        res.json({ success: true });
      }
    );
  });
});

app.delete('/inventario/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  db.run('DELETE FROM inventario WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    res.json({ success: true });
  });
});

// --- Estadísticas (admin) ---
app.get('/estadisticas', requireAuth, (req, res) => {
  const stats = {};
  db.get('SELECT SUM(monto) as total FROM transacciones WHERE tipo = "compra"', [], (err, row) => {
    stats.totalCompras = row?.total || 0;
    db.get('SELECT SUM(monto) as total FROM transacciones WHERE tipo = "venta"', [], (err, row) => {
      stats.totalVentas = row?.total || 0;
      stats.ganancia = stats.totalVentas - stats.totalCompras;
      db.all('SELECT categoria, COUNT(*) as cantidad, estado FROM inventario GROUP BY categoria, estado', [], (err, rows) => {
        stats.inventarioPorCategoria = rows;
        db.get('SELECT COUNT(*) as total FROM inventario WHERE estado = "vendido"', [], (err, row) => {
          stats.productosVendidos = row?.total || 0;
          db.get('SELECT COUNT(*) as total FROM inventario WHERE estado = "disponible"', [], (err, row) => {
            stats.productosDisponibles = row?.total || 0;
            res.json(stats);
          });
        });
      });
    });
  });
});

// --- Consultas ---
app.post('/consulta', (req, res) => {
  const producto_id = parseInt(req.body.producto_id);
  const producto_nombre = sanitizeText(req.body.producto_nombre, 200);
  const categoria = sanitizeText(req.body.categoria, 50);
  const nombre_cliente = sanitizeText(req.body.nombre_cliente, 100);
  const email = sanitizeText(req.body.email, 200);
  const telefono = sanitizeText(req.body.telefono, 30);
  const mensaje = sanitizeText(req.body.mensaje, 1000);

  if (!producto_id || !nombre_cliente || !email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const fecha = Date.now();
  db.run(
    'INSERT INTO consultas (producto_id, producto_nombre, categoria, nombre_cliente, email, telefono, mensaje, fecha, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [producto_id, producto_nombre, categoria, nombre_cliente, email, telefono, mensaje, fecha, 'pendiente'],
    function(err) {
      if (err) return res.status(500).json({ error: 'Error interno' });
      res.json({ id: this.lastID, success: true });
    }
  );
});

app.get('/consultas', requireAuth, (req, res) => {
  db.all('SELECT * FROM consultas ORDER BY fecha DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    res.json(rows);
  });
});

app.put('/consulta/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const estado = sanitizeText(req.body.estado, 20);
  const estadosValidos = ['pendiente', 'atendida', 'cerrada'];

  if (!id || !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  db.run('UPDATE consultas SET estado = ? WHERE id = ?', [estado, id], (err) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    res.json({ success: true });
  });
});

// --- Arranque ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
