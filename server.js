const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));
app.use('/imagenes', express.static('imagenes'));

// Simple session storage (in production, use express-session with a proper store)
const sessions = new Map();

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Middleware to check authentication
function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (sessionId && sessions.has(sessionId)) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Admin credentials (in production, hash the password and store in database)
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'vintage2026'; // Cambia esta contraseña

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login attempt:', { username, password }); // Debug
  console.log('Expected:', { user: ADMIN_USER, pass: ADMIN_PASSWORD }); // Debug
  
  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    const sessionId = generateSessionId();
    sessions.set(sessionId, { username, loginTime: Date.now() });
    console.log('Login successful, sessionId:', sessionId); // Debug
    res.json({ success: true, sessionId });
  } else {
    console.log('Login failed'); // Debug
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// Logout endpoint
app.post('/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.json({ success: true });
});

// Check auth status
app.get('/check-auth', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId && sessions.has(sessionId)) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

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

app.get('/productos', (req, res) => {
  db.all('SELECT * FROM productos ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/subir-producto', (req, res) => {
  const { nombre, descripcion, precio_inicial, duracion, imagen } = req.body;
  const fecha_inicio = Date.now();
  
  db.run(
    'INSERT INTO productos (nombre, descripcion, precio_inicial, duracion, fecha_inicio, imagen) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, descripcion, precio_inicial, duracion, fecha_inicio, imagen],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, success: true });
    }
  );
});

app.post('/pujar', (req, res) => {
  const { producto_id, apodo, email, telefono, monto } = req.body;
  const codigo = 'BID' + Math.random().toString(36).substr(2, 9).toUpperCase();
  const fecha = Date.now();
  
  db.run(
    'INSERT INTO pujas (producto_id, apodo, codigo, email, telefono, monto, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [producto_id, apodo, codigo, email, telefono, monto, fecha],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, codigo, success: true });
    }
  );
});

app.get('/historial/:id', (req, res) => {
  const producto_id = req.params.id;
  db.all(
    'SELECT * FROM pujas WHERE producto_id = ? ORDER BY monto DESC, fecha DESC',
    [producto_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

app.post('/borrar-historial', (req, res) => {
  const { producto_id } = req.body;
  db.run('DELETE FROM pujas WHERE producto_id = ?', [producto_id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

app.delete('/producto/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM productos WHERE id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.run('DELETE FROM pujas WHERE producto_id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });
});

// Inventario endpoints (public view - no auth required for viewing)
app.get('/inventario', (req, res) => {
  const categoria = req.query.categoria;
  const isAdmin = req.headers['x-session-id'] && sessions.has(req.headers['x-session-id']);
  
  let query = 'SELECT * FROM inventario WHERE estado != "vendido"';
  let params = [];
  
  if (categoria && categoria !== 'all') {
    query += ' AND categoria = ?';
    params.push(categoria);
  }
  
  query += ' ORDER BY fecha_ingreso DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // If not admin, hide purchase price and profit info
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
  const { nombre, descripcion, categoria, precio_compra, precio_venta, estado, imagen } = req.body;
  const fecha_ingreso = Date.now();
  
  db.run(
    'INSERT INTO inventario (nombre, descripcion, categoria, precio_compra, precio_venta, estado, imagen, fecha_ingreso) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nombre, descripcion, categoria, precio_compra, precio_venta, estado, imagen, fecha_ingreso],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Registrar transacción de compra
      db.run(
        'INSERT INTO transacciones (inventario_id, tipo, monto, descripcion, fecha) VALUES (?, ?, ?, ?, ?)',
        [this.lastID, 'compra', precio_compra, `Compra: ${nombre}`, fecha_ingreso],
        (err) => {
          if (err) console.error('Error registrando transacción:', err);
        }
      );
      
      res.json({ id: this.lastID, success: true });
    }
  );
});

app.put('/inventario/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const { estado, precio_venta } = req.body;
  const fecha_venta = estado === 'vendido' ? Date.now() : null;
  
  db.get('SELECT * FROM inventario WHERE id = ?', [id], (err, item) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    db.run(
      'UPDATE inventario SET estado = ?, precio_venta = ?, fecha_venta = ? WHERE id = ?',
      [estado, precio_venta, fecha_venta, id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Registrar transacción de venta
        if (estado === 'vendido') {
          db.run(
            'INSERT INTO transacciones (inventario_id, tipo, monto, descripcion, fecha) VALUES (?, ?, ?, ?, ?)',
            [id, 'venta', precio_venta, `Venta: ${item.nombre}`, fecha_venta],
            (err) => {
              if (err) console.error('Error registrando transacción:', err);
            }
          );
        }
        
        res.json({ success: true });
      }
    );
  });
});

app.delete('/inventario/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM inventario WHERE id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Estadísticas contables (protected)
app.get('/estadisticas', requireAuth, (req, res) => {
  const stats = {};
  
  // Total compras
  db.get('SELECT SUM(monto) as total FROM transacciones WHERE tipo = "compra"', [], (err, row) => {
    stats.totalCompras = row.total || 0;
    
    // Total ventas
    db.get('SELECT SUM(monto) as total FROM transacciones WHERE tipo = "venta"', [], (err, row) => {
      stats.totalVentas = row.total || 0;
      stats.ganancia = stats.totalVentas - stats.totalCompras;
      
      // Inventario por categoría
      db.all('SELECT categoria, COUNT(*) as cantidad, estado FROM inventario GROUP BY categoria, estado', [], (err, rows) => {
        stats.inventarioPorCategoria = rows;
        
        // Productos vendidos
        db.get('SELECT COUNT(*) as total FROM inventario WHERE estado = "vendido"', [], (err, row) => {
          stats.productosVendidos = row.total || 0;
          
          // Productos disponibles
          db.get('SELECT COUNT(*) as total FROM inventario WHERE estado = "disponible"', [], (err, row) => {
            stats.productosDisponibles = row.total || 0;
            
            res.json(stats);
          });
        });
      });
    });
  });
});

// Contact/Interest endpoint (public)
app.post('/consulta', (req, res) => {
  const { producto_id, producto_nombre, categoria, nombre_cliente, email, telefono, mensaje } = req.body;
  const fecha = Date.now();
  
  db.run(
    'INSERT INTO consultas (producto_id, producto_nombre, categoria, nombre_cliente, email, telefono, mensaje, fecha, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [producto_id, producto_nombre, categoria, nombre_cliente, email, telefono, mensaje, fecha, 'pendiente'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, success: true });
    }
  );
});

// Get all inquiries (admin only)
app.get('/consultas', requireAuth, (req, res) => {
  db.all('SELECT * FROM consultas ORDER BY fecha DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Update inquiry status (admin only)
app.put('/consulta/:id', requireAuth, (req, res) => {
  const { estado } = req.body;
  db.run('UPDATE consultas SET estado = ? WHERE id = ?', [estado, req.params.id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
