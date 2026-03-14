let productos = [];
let timers = {};

async function loadProducts() {
  try {
    const response = await fetch('/productos');
    productos = await response.json();
    renderProducts();
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function renderProducts() {
  const productList = document.getElementById('productList');
  
  if (productos.length === 0) {
    productList.innerHTML = '<p style="text-align: center; color: #999;">No active auctions</p>';
    return;
  }

  productList.innerHTML = productos.map(producto => {
    const timeRemaining = calculateTimeRemaining(producto);
    return `
      <div class="product-card" data-id="${producto.id}">
        <div class="product-header">
          <div class="product-info">
            <h3>${producto.nombre}</h3>
            <p>${producto.descripcion || ''}</p>
            <p><strong>Starting Price:</strong> $${producto.precio_inicial.toFixed(2)}</p>
          </div>
          <div class="timer" id="timer-${producto.id}">
            ${formatTime(timeRemaining)}
          </div>
        </div>
        ${producto.imagen ? `<img src="${producto.imagen.startsWith('http') ? producto.imagen : '/imagenes/' + producto.imagen}" alt="${producto.nombre}" class="product-image">` : ''}
        <div class="product-actions">
          <button onclick="openBidModal(${producto.id})" ${timeRemaining <= 0 ? 'disabled' : ''}>
            ${timeRemaining <= 0 ? 'Auction Ended' : 'Place Bid'}
          </button>
          <button onclick="viewHistory(${producto.id})">View History</button>
          <button class="delete-btn" onclick="deleteProduct(${producto.id})">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  startTimers();
}

function calculateTimeRemaining(producto) {
  const endTime = producto.fecha_inicio + (producto.duracion * 60 * 1000);
  const now = Date.now();
  return Math.max(0, endTime - now);
}

function formatTime(ms) {
  if (ms <= 0) return 'ENDED';
  
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

function startTimers() {
  Object.values(timers).forEach(timer => clearInterval(timer));
  timers = {};

  productos.forEach(producto => {
    const timerElement = document.getElementById(`timer-${producto.id}`);
    if (!timerElement) return;

    timers[producto.id] = setInterval(() => {
      const timeRemaining = calculateTimeRemaining(producto);
      timerElement.textContent = formatTime(timeRemaining);
      
      if (timeRemaining <= 0) {
        timerElement.classList.add('ended');
        clearInterval(timers[producto.id]);
        renderProducts();
      }
    }, 1000);
  });
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    nombre: document.getElementById('nombre').value,
    descripcion: document.getElementById('descripcion').value,
    precio_inicial: parseFloat(document.getElementById('precio_inicial').value),
    duracion: parseInt(document.getElementById('duracion').value),
    imagen: document.getElementById('imagen').value
  };

  try {
    const response = await fetch('/subir-producto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      document.getElementById('productForm').reset();
      loadProducts();
      alert('Product published successfully!');
    }
  } catch (error) {
    console.error('Error publishing product:', error);
    alert('Error publishing product');
  }
});

document.getElementById('resetForm').addEventListener('click', () => {
  document.getElementById('productForm').reset();
});

function openBidModal(productId) {
  const producto = productos.find(p => p.id === productId);
  if (!producto) return;

  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');

  modalBody.innerHTML = `
    <h2>Place Your Bid</h2>
    <h3>${producto.nombre}</h3>
    <p><strong>Current Starting Price:</strong> $${producto.precio_inicial.toFixed(2)}</p>
    <form class="bid-form" id="bidForm">
      <input type="text" id="apodo" placeholder="Your Nickname" required>
      <input type="email" id="email" placeholder="Email" required>
      <input type="tel" id="telefono" placeholder="Phone Number" required>
      <input type="number" id="monto" placeholder="Bid Amount" step="0.01" min="${producto.precio_inicial}" required>
      <button type="submit">Submit Bid</button>
    </form>
  `;

  modal.style.display = 'block';

  document.getElementById('bidForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitBid(productId);
  });
}

async function submitBid(productId) {
  const bidData = {
    producto_id: productId,
    apodo: document.getElementById('apodo').value,
    email: document.getElementById('email').value,
    telefono: document.getElementById('telefono').value,
    monto: parseFloat(document.getElementById('monto').value)
  };

  try {
    const response = await fetch('/pujar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bidData)
    });

    const result = await response.json();
    
    if (result.success) {
      alert(`Bid placed successfully! Your bidder code is: ${result.codigo}`);
      closeModal();
    }
  } catch (error) {
    console.error('Error placing bid:', error);
    alert('Error placing bid');
  }
}

async function viewHistory(productId) {
  const producto = productos.find(p => p.id === productId);
  const timeRemaining = calculateTimeRemaining(producto);
  
  try {
    const response = await fetch(`/historial/${productId}`);
    const historial = await response.json();

    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');

    if (timeRemaining <= 0 && historial.length > 0) {
      const winner = historial[0];
      modalBody.innerHTML = `
        <div class="winner-screen">
          <h2>🎉 Auction Finished! 🎉</h2>
          <div class="winner-info">
            <p><strong>Winner:</strong> ${winner.apodo}</p>
            <p><strong>Bidder Code:</strong> ${winner.codigo}</p>
            <p><strong>Final Price:</strong> $${winner.monto.toFixed(2)}</p>
            <p><strong>Email:</strong> ${winner.email}</p>
            <p><strong>Phone:</strong> ${winner.telefono}</p>
          </div>
        </div>
        <div class="bid-history">
          <h3>Bid History</h3>
          ${historial.map((bid, index) => `
            <div class="bid-item ${index === 0 ? 'winner' : ''}">
              <p><strong>${bid.apodo}</strong> (${bid.codigo})</p>
              <p>Amount: $${bid.monto.toFixed(2)}</p>
              <p>Time: ${new Date(bid.fecha).toLocaleString()}</p>
            </div>
          `).join('')}
          <button class="clear-history-btn" onclick="clearHistory(${productId})">Clear Bid History</button>
        </div>
      `;
    } else {
      modalBody.innerHTML = `
        <h2>Bid History</h2>
        <h3>${producto.nombre}</h3>
        <div class="bid-history">
          ${historial.length === 0 ? '<p style="text-align: center; color: #999;">No bids yet</p>' : 
            historial.map(bid => `
              <div class="bid-item">
                <p><strong>${bid.apodo}</strong> (${bid.codigo})</p>
                <p>Amount: $${bid.monto.toFixed(2)}</p>
                <p>Time: ${new Date(bid.fecha).toLocaleString()}</p>
              </div>
            `).join('')
          }
          ${historial.length > 0 ? `<button class="clear-history-btn" onclick="clearHistory(${productId})">Clear Bid History</button>` : ''}
        </div>
      `;
    }

    modal.style.display = 'block';
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

async function clearHistory(productId) {
  if (!confirm('Are you sure you want to clear the bid history?')) return;

  try {
    const response = await fetch('/borrar-historial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ producto_id: productId })
    });

    if (response.ok) {
      alert('Bid history cleared successfully!');
      closeModal();
    }
  } catch (error) {
    console.error('Error clearing history:', error);
    alert('Error clearing history');
  }
}

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    const response = await fetch(`/producto/${productId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      alert('Product deleted successfully!');
      loadProducts();
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Error deleting product');
  }
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

document.querySelector('.close').addEventListener('click', closeModal);

window.addEventListener('click', (e) => {
  const modal = document.getElementById('modal');
  if (e.target === modal) {
    closeModal();
  }
});

loadProducts();
setInterval(loadProducts, 30000);

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.section;
    
    // Update active button
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update active section
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    
    if (section === 'auctions') {
      document.getElementById('auctions-section').classList.add('active');
    } else if (section === 'contabilidad') {
      document.getElementById('contabilidad-section').classList.add('active');
      loadEstadisticas();
    } else if (section === 'consultas') {
      document.getElementById('consultas-section').classList.add('active');
      loadConsultas();
    } else {
      document.getElementById('inventory-section').classList.add('active');
      loadInventory(section);
      updateInventoryTitle(section);
    }
  });
});

// Inventory Management
let currentCategory = 'vitrina';

function updateInventoryTitle(categoria) {
  const titles = {
    'vitrina': 'Vitrina de Exhibición',
    'muebles': 'Muebles',
    'libros': 'Libros'
  };
  document.getElementById('inventoryTitle').textContent = titles[categoria] || 'Inventory';
  currentCategory = categoria;
}

async function loadInventory(categoria) {
  try {
    const response = await fetch(`/inventario?categoria=${categoria}`);
    const items = await response.json();
    renderInventory(items);
  } catch (error) {
    console.error('Error loading inventory:', error);
  }
}

function renderInventory(items) {
  const inventoryList = document.getElementById('inventoryList');
  
  if (items.length === 0) {
    inventoryList.innerHTML = '<p style="text-align: center; color: #999;">No items in this category</p>';
    return;
  }

  inventoryList.innerHTML = items.map(item => `
    <div class="inventory-card ${item.estado}">
      <div class="product-info">
        <h3>${item.nombre}</h3>
        <p>${item.descripcion || ''}</p>
        <span class="status-badge ${item.estado}">${item.estado.toUpperCase()}</span>
        ${isAuthenticated ? `<p><strong>Purchase Price:</strong> $${item.precio_compra.toFixed(2)}</p>` : ''}
        ${item.precio_venta ? `<p><strong>${isAuthenticated ? 'Sale' : ''} Price:</strong> $${item.precio_venta.toFixed(2)}</p>` : ''}
        ${isAuthenticated && item.estado === 'vendido' && item.precio_venta ? `<p><strong>Profit:</strong> $${(item.precio_venta - item.precio_compra).toFixed(2)}</p>` : ''}
      </div>
      ${item.imagen ? `<img src="${item.imagen.startsWith('http') ? item.imagen : '/imagenes/' + item.imagen}" alt="${item.nombre}" class="product-image">` : ''}
      <div class="inventory-actions">
        ${!isAuthenticated && item.estado === 'disponible' ? `<button class="interest-btn" onclick="showInterestForm(${item.id}, '${item.nombre.replace(/'/g, "\\'")}', '${item.categoria}')">Estoy Interesado</button>` : ''}
        ${isAuthenticated && item.estado === 'disponible' ? `<button class="sell-btn" onclick="markAsSold(${item.id})">Mark as Sold</button>` : ''}
        ${isAuthenticated ? `<button class="delete-btn" onclick="deleteInventoryItem(${item.id})">Delete</button>` : ''}
      </div>
    </div>
  `).join('');
}

document.getElementById('inventoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    nombre: document.getElementById('inv_nombre').value,
    descripcion: document.getElementById('inv_descripcion').value,
    categoria: document.getElementById('inv_categoria').value,
    precio_compra: parseFloat(document.getElementById('inv_precio_compra').value),
    precio_venta: parseFloat(document.getElementById('inv_precio_venta').value) || null,
    estado: document.getElementById('inv_estado').value,
    imagen: document.getElementById('inv_imagen').value
  };

  try {
    const response = await fetch('/inventario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      document.getElementById('inventoryForm').reset();
      alert('Item added to inventory successfully!');
      if (currentCategory === formData.categoria) {
        loadInventory(currentCategory);
      }
    }
  } catch (error) {
    console.error('Error adding item:', error);
    alert('Error adding item to inventory');
  }
});

document.getElementById('resetInventoryForm').addEventListener('click', () => {
  document.getElementById('inventoryForm').reset();
});

async function markAsSold(itemId) {
  const precio = prompt('Enter the sale price:');
  if (!precio) return;

  try {
    const response = await fetch(`/inventario/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        estado: 'vendido',
        precio_venta: parseFloat(precio)
      })
    });

    if (response.ok) {
      alert('Item marked as sold!');
      loadInventory(currentCategory);
    }
  } catch (error) {
    console.error('Error updating item:', error);
    alert('Error updating item');
  }
}

async function deleteInventoryItem(itemId) {
  if (!confirm('Are you sure you want to delete this item?')) return;

  try {
    const response = await fetch(`/inventario/${itemId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      alert('Item deleted successfully!');
      loadInventory(currentCategory);
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    alert('Error deleting item');
  }
}

// Estadísticas
async function loadEstadisticas() {
  try {
    const response = await fetch('/estadisticas');
    const stats = await response.json();
    
    document.getElementById('totalCompras').textContent = `$${stats.totalCompras.toFixed(2)}`;
    document.getElementById('totalVentas').textContent = `$${stats.totalVentas.toFixed(2)}`;
    document.getElementById('ganancia').textContent = `$${stats.ganancia.toFixed(2)}`;
    document.getElementById('productosDisponibles').textContent = stats.productosDisponibles;
    document.getElementById('productosVendidos').textContent = stats.productosVendidos;
    
    // Inventario por categoría
    const categoryStats = document.getElementById('categoryStats');
    const categorias = {};
    
    stats.inventarioPorCategoria.forEach(item => {
      if (!categorias[item.categoria]) {
        categorias[item.categoria] = { disponible: 0, vendido: 0, reservado: 0 };
      }
      categorias[item.categoria][item.estado] = item.cantidad;
    });
    
    categoryStats.innerHTML = Object.keys(categorias).map(cat => `
      <div class="category-item">
        <strong>${cat.charAt(0).toUpperCase() + cat.slice(1)}</strong>
        <span>Disponible: ${categorias[cat].disponible || 0} | Vendido: ${categorias[cat].vendido || 0} | Reservado: ${categorias[cat].reservado || 0}</span>
      </div>
    `).join('') || '<p style="text-align: center; color: #999;">No data available</p>';
    
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

// Interest form for public users
function showInterestForm(productoId, productoNombre, categoria) {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');

  modalBody.innerHTML = `
    <h2>Estoy Interesado</h2>
    <h3>${productoNombre}</h3>
    <p style="color: #666; margin-bottom: 20px;">Complete el formulario y nos pondremos en contacto con usted</p>
    <form class="bid-form" id="interestForm">
      <input type="text" id="nombre_cliente" placeholder="Su Nombre Completo" required>
      <input type="email" id="email_cliente" placeholder="Email" required>
      <input type="tel" id="telefono_cliente" placeholder="Teléfono" required>
      <textarea id="mensaje_cliente" placeholder="Mensaje (opcional)" rows="3"></textarea>
      <button type="submit">Enviar Consulta</button>
    </form>
  `;

  modal.style.display = 'block';

  document.getElementById('interestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitInterest(productoId, productoNombre, categoria);
  });
}

async function submitInterest(productoId, productoNombre, categoria) {
  const consultaData = {
    producto_id: productoId,
    producto_nombre: productoNombre,
    categoria: categoria,
    nombre_cliente: document.getElementById('nombre_cliente').value,
    email: document.getElementById('email_cliente').value,
    telefono: document.getElementById('telefono_cliente').value,
    mensaje: document.getElementById('mensaje_cliente').value
  };

  try {
    const response = await fetch('/consulta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(consultaData)
    });

    const result = await response.json();
    
    if (result.success) {
      alert('¡Gracias por su interés! Nos pondremos en contacto con usted pronto.');
      closeModal();
    }
  } catch (error) {
    console.error('Error submitting interest:', error);
    alert('Error al enviar la consulta');
  }
}

// Load customer inquiries (admin only)
async function loadConsultas() {
  try {
    const response = await fetch('/consultas');
    const consultas = await response.json();
    renderConsultas(consultas);
  } catch (error) {
    console.error('Error loading inquiries:', error);
  }
}

function renderConsultas(consultas) {
  const consultasList = document.getElementById('consultasList');
  
  if (consultas.length === 0) {
    consultasList.innerHTML = '<p style="text-align: center; color: #999;">No inquiries yet</p>';
    return;
  }

  consultasList.innerHTML = consultas.map(consulta => `
    <div class="consulta-card ${consulta.estado}">
      <div class="consulta-header">
        <h3>${consulta.producto_nombre}</h3>
        <span class="status-badge ${consulta.estado}">${consulta.estado.toUpperCase()}</span>
      </div>
      <div class="consulta-body">
        <p><strong>Cliente:</strong> ${consulta.nombre_cliente}</p>
        <p><strong>Email:</strong> <a href="mailto:${consulta.email}">${consulta.email}</a></p>
        <p><strong>Teléfono:</strong> <a href="tel:${consulta.telefono}">${consulta.telefono}</a></p>
        <p><strong>Categoría:</strong> ${consulta.categoria}</p>
        ${consulta.mensaje ? `<p><strong>Mensaje:</strong> ${consulta.mensaje}</p>` : ''}
        <p><strong>Fecha:</strong> ${new Date(consulta.fecha).toLocaleString()}</p>
      </div>
      <div class="consulta-actions">
        ${consulta.estado === 'pendiente' ? `<button onclick="updateConsultaStatus(${consulta.id}, 'contactado')">Marcar como Contactado</button>` : ''}
        ${consulta.estado === 'contactado' ? `<button onclick="updateConsultaStatus(${consulta.id}, 'completado')">Marcar como Completado</button>` : ''}
        <button class="delete-btn" onclick="updateConsultaStatus(${consulta.id}, 'archivado')">Archivar</button>
      </div>
    </div>
  `).join('');
}

async function updateConsultaStatus(consultaId, nuevoEstado) {
  try {
    const response = await fetch(`/consulta/${consultaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    });

    if (response.ok) {
      loadConsultas();
    }
  } catch (error) {
    console.error('Error updating inquiry:', error);
  }
}
