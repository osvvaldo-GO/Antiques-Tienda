const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

const sampleData = [
  // Vitrina de Exhibición
  {
    nombre: 'Jarrón de Porcelana China',
    descripcion: 'Jarrón decorativo del siglo XIX, porcelana fina con detalles en oro',
    categoria: 'vitrina',
    precio_compra: 150000,
    precio_venta: 250000,
    estado: 'disponible',
    imagen: ''
  },
  {
    nombre: 'Reloj de Mesa Francés',
    descripcion: 'Reloj de bronce dorado, estilo Luis XV, funcionando perfectamente',
    categoria: 'vitrina',
    precio_compra: 80000,
    precio_venta: 150000,
    estado: 'disponible',
    imagen: ''
  },
  {
    nombre: 'Candelabro de Plata',
    descripcion: 'Candelabro de 5 brazos, plata 925, estilo barroco',
    categoria: 'vitrina',
    precio_compra: 200000,
    precio_venta: 350000,
    estado: 'vendido',
    imagen: ''
  },
  {
    nombre: 'Figura de Bronce Art Deco',
    descripcion: 'Escultura de bailarina, bronce macizo, años 1920',
    categoria: 'vitrina',
    precio_compra: 120000,
    precio_venta: 220000,
    estado: 'disponible',
    imagen: ''
  },
  
  // Muebles
  {
    nombre: 'Silla Victoriana',
    descripcion: 'Silla de madera tallada con tapizado original en terciopelo',
    categoria: 'muebles',
    precio_compra: 120000,
    precio_venta: 220000,
    estado: 'disponible',
    imagen: ''
  },
  {
    nombre: 'Mesa de Comedor Vintage',
    descripcion: 'Mesa extensible de roble, capacidad 8 personas, año 1950',
    categoria: 'muebles',
    precio_compra: 300000,
    precio_venta: 550000,
    estado: 'vendido',
    imagen: ''
  },
  {
    nombre: 'Escritorio Secreter',
    descripcion: 'Escritorio con compartimentos secretos, madera de caoba',
    categoria: 'muebles',
    precio_compra: 250000,
    precio_venta: 450000,
    estado: 'reservado',
    imagen: ''
  },
  {
    nombre: 'Cómoda Luis XVI',
    descripcion: 'Cómoda de 4 cajones, marquetería floral, mármol superior',
    categoria: 'muebles',
    precio_compra: 400000,
    precio_venta: 750000,
    estado: 'disponible',
    imagen: ''
  },
  {
    nombre: 'Espejo de Pie Barroco',
    descripcion: 'Espejo con marco tallado y dorado, altura 180cm',
    categoria: 'muebles',
    precio_compra: 180000,
    precio_venta: 320000,
    estado: 'vendido',
    imagen: ''
  },
  
  // Libros
  {
    nombre: 'Don Quijote de la Mancha - Edición 1905',
    descripcion: 'Primera edición ilustrada, encuadernación en cuero',
    categoria: 'libros',
    precio_compra: 50000,
    precio_venta: 120000,
    estado: 'disponible',
    imagen: ''
  },
  {
    nombre: 'Colección Completa de Shakespeare',
    descripcion: '12 tomos, edición de 1890, tapas duras con detalles dorados',
    categoria: 'libros',
    precio_compra: 180000,
    precio_venta: 350000,
    estado: 'vendido',
    imagen: ''
  },
  {
    nombre: 'Cien Años de Soledad - Primera Edición',
    descripcion: 'Primera edición firmada por García Márquez, 1967',
    categoria: 'libros',
    precio_compra: 300000,
    precio_venta: 600000,
    estado: 'disponible',
    imagen: ''
  },
  {
    nombre: 'La Divina Comedia - Edición Ilustrada 1880',
    descripcion: 'Edición con grabados de Gustave Doré, encuadernación de lujo',
    categoria: 'libros',
    precio_compra: 220000,
    precio_venta: 450000,
    estado: 'disponible',
    imagen: ''
  },
  {
    nombre: 'Atlas Geográfico Antiguo 1850',
    descripcion: 'Atlas con mapas coloreados a mano, 45 láminas',
    categoria: 'libros',
    precio_compra: 150000,
    precio_venta: 280000,
    estado: 'vendido',
    imagen: ''
  },
  {
    nombre: 'Enciclopedia Británica 1911',
    descripcion: 'Colección completa 29 volúmenes, edición histórica',
    categoria: 'libros',
    precio_compra: 280000,
    precio_venta: 500000,
    estado: 'reservado',
    imagen: ''
  }
];

console.log('🌱 Seeding database with sample data...\n');

let completed = 0;
const total = sampleData.length;

sampleData.forEach((item, index) => {
  const fecha_ingreso = Date.now() - (index * 86400000); // Diferentes fechas
  const fecha_venta = item.estado === 'vendido' ? fecha_ingreso + 604800000 : null; // 7 días después
  
  db.run(
    'INSERT INTO inventario (nombre, descripcion, categoria, precio_compra, precio_venta, estado, imagen, fecha_ingreso, fecha_venta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [item.nombre, item.descripcion, item.categoria, item.precio_compra, item.precio_venta, item.estado, item.imagen, fecha_ingreso, fecha_venta],
    function(err) {
      if (err) {
        console.error(`❌ Error adding ${item.nombre}:`, err.message);
      } else {
        console.log(`✅ Added: ${item.nombre} (${item.categoria})`);
        
        // Registrar transacción de compra
        db.run(
          'INSERT INTO transacciones (inventario_id, tipo, monto, descripcion, fecha) VALUES (?, ?, ?, ?, ?)',
          [this.lastID, 'compra', item.precio_compra, `Compra: ${item.nombre}`, fecha_ingreso],
          (err) => {
            if (err) console.error('Error registrando compra:', err.message);
          }
        );
        
        // Si está vendido, registrar transacción de venta
        if (item.estado === 'vendido') {
          db.run(
            'INSERT INTO transacciones (inventario_id, tipo, monto, descripcion, fecha) VALUES (?, ?, ?, ?, ?)',
            [this.lastID, 'venta', item.precio_venta, `Venta: ${item.nombre}`, fecha_venta],
            (err) => {
              if (err) console.error('Error registrando venta:', err.message);
            }
          );
        }
      }
      
      completed++;
      if (completed === total) {
        console.log(`\n🎉 Database seeded successfully!`);
        console.log(`📊 Added ${total} items to inventory`);
        console.log(`\n💡 Now you can:`);
        console.log(`   1. Start the server: npm start`);
        console.log(`   2. Open http://localhost:3000`);
        console.log(`   3. Click on each category button to see the items`);
        console.log(`   4. Click on "Contabilidad" to see statistics\n`);
        db.close();
      }
    }
  );
});
