let productos = [];
let timers = {};

// ============================================================
// SUBASTAS
// ============================================================

async function loadProducts() {
  try {
    const response = await fetch('/productos');
    productos = await response.json();
    renderProducts();
  } catch (error) {
    console.error('Error cargando productos:', error);
  }
}

function renderProducts() {
  const productList = document.getElementById('productList');

  if (productos.length === 0) {
    productList.innerHTML = '<p style="text-align:center;color:#999;">No hay subastas activas</p>';
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
            <p><strong>Precio inicial:</strong> $${producto.precio_inicial.toFixed(2)}</p>
          </div>
          <div class="timer ${timeRemaining <= 0 ? 'ended' : ''}" id="timer-${producto.id}">
            ${formatTime(timeRemaining)}
          </div>
        </div>
        ${producto.imagen ? `<img src="${producto.imagen.startsWith('http') || producto.imagen.startsWith('/') ? producto.imagen : '/imagenes/' + producto.imagen}" alt="${producto.nombre}" class="product-image">` : ''}
        <div class="product-actions">
          <button onclick="openBidModal(${producto.id})" ${timeRemaining <= 0 ? 'disabled' : ''}>
            ${timeRemaining <= 0 ? 'Subasta finalizada' : 'Hacer oferta'}
          </button>
          <button onclick="viewHistory(${producto.id})">Ver historial</button>
          <button class="delete-btn admin-only" style="display:none" onclick="deleteProduct(${producto.id})">🗑 Eliminar</button>
        </div>
      </div>
    `;
  }).join('');

  // Mostrar botones admin si está autenticado
  if (typeof isAuthenticated !== 'undefined' && isAuthenticated) {
    document.querySelectorAll('.product-card .admin-only').forEach(el => el.style.display = '');
  }

  startTimers();
}

function calculateTimeRemaining(producto) {
  const endTime = producto.fecha_inicio + (producto.duracion * 60 * 1000);
  return Math.max(0, endTime - Date.now());
}

function formatTime(ms) {
  if (ms <= 0) return 'FINALIZADA';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`;
}

function startTimers() {
  Object.values(timers).forEach(t => clearInterval(t));
  timers = {};
  productos.forEach(producto => {
    const el = document.getElementById(`timer-${producto.id}`);
    if (!el) return;
    timers[producto.id] = setInterval(() => {
      const remaining = calculateTimeRemaining(producto);
      el.textContent = formatTime(remaining);
      if (remaining <= 0) {
        el.classList.add('ended');
        clearInterval(timers[producto.id]);
        renderProducts();
      }
    }, 1000);
  });
}

// ============================================================
// SUBIDA DE IMÁGENES — INVENTARIO
// ============================================================

let uploadedImageUrl = '';

document.getElementById('inv_imagen_file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await uploadImage(file, 'inv');
});

async function uploadImage(file, prefix) {
  const formData = new FormData();
  formData.append('imagen', file);

  try {
    const res = await fetch('/upload-imagen', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.url) {
      if (prefix === 'inv') {
        uploadedImageUrl = data.url;
        document.getElementById('inv_imagen_url').value = data.url;
        document.getElementById('uploadPreview').src = data.url;
        document.getElementById('uploadPreview').style.display = 'block';
        document.getElementById('uploadPlaceholder').style.display = 'none';
        document.getElementById('removeImageBtn').style.display = 'inline-block';
      } else {
        uploadedSubastaImageUrl = data.url;
        document.getElementById('imagen').value = data.url;
        document.getElementById('uploadPreviewSubasta').src = data.url;
        document.getElementById('uploadPreviewSubasta').style.display = 'block';
        document.getElementById('uploadPlaceholderSubasta').style.display = 'none';
        document.getElementById('removeImageBtnSubasta').style.display = 'inline-block';
      }
    } else {
      alert('Error al subir la imagen: ' + (data.error || 'desconocido'));
    }
  } catch (err) {
    alert('Error de conexión al subir imagen');
  }
}

function removeImage() {
  uploadedImageUrl = '';
  document.getElementById('inv_imagen_url').value = '';
  document.getElementById('uploadPreview').src = '';
  document.getElementById('uploadPreview').style.display = 'none';
  document.getElementById('uploadPlaceholder').style.display = 'block';
  document.getElementById('removeImageBtn').style.display = 'none';
  document.getElementById('inv_imagen_file').value = '';
}

// ============================================================
// SUBIDA DE IMÁGENES — SUBASTAS
// ============================================================

let uploadedSubastaImageUrl = '';

document.getElementById('subasta_imagen_file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await uploadImage(file, 'subasta');
});

function removeImageSubasta() {
  uploadedSubastaImageUrl = '';
  document.getElementById('imagen').value = '';
  document.getElementById('uploadPreviewSubasta').src = '';
  document.getElementById('uploadPreviewSubasta').style.display = 'none';
  document.getElementById('uploadPlaceholderSubasta').style.display = 'block';
  document.getElementById('removeImageBtnSubasta').style.display = 'none';
  document.getElementById('subasta_imagen_file').value = '';
}

// ============================================================
// FORMULARIO SUBASTAS
// ============================================================

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
      removeImageSubasta();
      loadProducts();
      alert('¡Artículo publicado en subasta!');
    }
  } catch (error) {
    alert('Error al publicar el artículo');
  }
});

document.getElementById('resetForm').addEventListener('click', () => {
  document.getElementById('productForm').reset();
  removeImageSubasta();
});

// ============================================================
// PUJAS
// ============================================================

function openBidModal(productId) {
  const producto = productos.find(p => p.id === productId);
  if (!producto) return;

  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');

  modalBody.innerHTML = `
    <h2>Hacer una oferta</h2>
    <h3>${producto.nombre}</h3>
    <p><strong>Precio inicial:</strong> $${producto.precio_inicial.toFixed(2)}</p>
    <form class="bid-form" id="bidForm">
      <input type="text" id="apodo" placeholder="Tu apodo" required>
      <input type="email" id="email" placeholder="Email" required>
      <input type="tel" id="telefono" placeholder="Teléfono" required>
      <input type="number" id="monto" placeholder="Monto de tu oferta" step="0.01" min="${producto.precio_inicial}" required>
      <button type="submit">Enviar oferta</button>
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
      alert(`¡Oferta enviada! Tu código de pujador es: ${result.codigo}`);
      closeModal();
    }
  } catch (error) {
    alert('Error al enviar la oferta');
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
          <h2>🎉 ¡Subasta finalizada!</h2>
          <div class="winner-info">
            <p><strong>Ganador:</strong> ${winner.apodo}</p>
            <p><strong>Código:</strong> ${winner.codigo}</p>
            <p><strong>Precio final:</strong> $${winner.monto.toFixed(2)}</p>
            <p><strong>Email:</strong> ${winner.email}</p>
            <p><strong>Teléfono:</strong> ${winner.telefono}</p>
          </div>
        </div>
        <div class="bid-history">
          <h3>Historial de ofertas</h3>
          ${historial.map((bid, i) => `
            <div class="bid-item ${i === 0 ? 'winner' : ''}">
              <p><strong>${bid.apodo}</strong> (${bid.codigo})</p>
              <p>Monto: $${bid.monto.toFixed(2)}</p>
              <p>Fecha: ${new Date(bid.fecha).toLocaleString()}</p>
            </div>
          `).join('')}
          <button class="clear-history-btn" onclick="clearHistory(${productId})">Limpiar historial</button>
        </div>
      `;
    } else {
      modalBody.innerHTML = `
        <h2>Historial de ofertas</h2>
        <h3>${producto.nombre}</h3>
        <div class="bid-history">
          ${historial.length === 0
            ? '<p style="text-align:center;color:#999;">Sin ofertas aún</p>'
            : historial.map(bid => `
              <div class="bid-item">
                <p><strong>${bid.apodo}</strong> (${bid.codigo})</p>
                <p>Monto: $${bid.monto.toFixed(2)}</p>
                <p>Fecha: ${new Date(bid.fecha).toLocaleString()}</p>
              </div>
            `).join('')
          }
          ${historial.length > 0 ? `<button class="clear-history-btn" onclick="clearHistory(${productId})">Limpiar historial</button>` : ''}
        </div>
      `;
    }
    modal.style.display = 'block';
  } catch (error) {
    console.error('Error cargando historial:', error);
  }
}

async function clearHistory(productId) {
  if (!confirm('¿Limpiar el historial de ofertas?')) return;
  try {
    await fetch('/borrar-historial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ producto_id: productId })
    });
    alert('Historial limpiado');
    closeModal();
  } catch (error) {
    alert('Error al limpiar historial');
  }
}

async function deleteProduct(productId) {
  if (!confirm('¿Eliminar este artículo de la subasta?')) return;
  try {
    const response = await fetch(`/producto/${productId}`, { method: 'DELETE' });
    if (response.ok) {
      alert('Artículo eliminado');
      loadProducts();
    }
  } catch (error) {
    alert('Error al eliminar');
  }
}

// ============================================================
// INVENTARIO
// ============================================================

let currentCategory = 'vitrina';

function updateInventoryTitle(categoria) {
  const titles = { vitrina: 'Vitrina de Exhibición', muebles: 'Muebles', libros: 'Libros' };
  document.getElementById('inventoryTitle').textContent = titles[categoria] || 'Inventario';
  currentCategory = categoria;
}

async function loadInventory(categoria) {
  try {
    const response = await fetch(`/inventario?categoria=${categoria}`);
    const items = await response.json();
    renderInventory(items);
  } catch (error) {
    console.error('Error cargando inventario:', error);
  }
}

function renderInventory(items) {
  const inventoryList = document.getElementById('inventoryList');

  if (items.length === 0) {
    inventoryList.innerHTML = '<p style="text-align:center;color:#999;">No hay artículos en esta categoría</p>';
    return;
  }

  const admin = typeof isAuthenticated !== 'undefined' && isAuthenticated;

  inventoryList.innerHTML = items.map(item => `
    <div class="inventory-card ${item.estado}">
      ${item.imagen ? `<img src="${item.imagen.startsWith('http') || item.imagen.startsWith('/') ? item.imagen : '/imagenes/' + item.imagen}" alt="${item.nombre}" class="product-image">` : ''}
      <div class="product-info">
        <h3>${item.nombre}</h3>
        <p>${item.descripcion || ''}</p>
        <span class="status-badge ${item.estado}">${item.estado.toUpperCase()}</span>
        ${admin && item.precio_compra ? `<p><strong>Precio compra:</strong> $${item.precio_compra.toFixed(2)}</p>` : ''}
        ${item.precio_venta ? `<p><strong>${admin ? 'Precio venta' : 'Precio'}:</strong> $${item.precio_venta.toFixed(2)}</p>` : ''}
        ${admin && item.estado === 'vendido' && item.precio_venta && item.precio_compra
          ? `<p><strong>Ganancia:</strong> $${(item.precio_venta - item.precio_compra).toFixed(2)}</p>` : ''}
      </div>
      <div class="inventory-actions">
        ${!admin && item.estado === 'disponible'
          ? `<button class="interest-btn" onclick="showInterestForm(${item.id}, '${item.nombre.replace(/'/g, "\\'")}', '${item.categoria}')">Estoy Interesado</button>` : ''}
        ${admin && item.estado === 'disponible'
          ? `<button class="sell-btn" onclick="markAsSold(${item.id})">Marcar como Vendido</button>` : ''}
        ${admin
          ? `<button class="delete-btn" onclick="deleteInventoryItem(${item.id})">🗑 Eliminar</button>` : ''}
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
    imagen: document.getElementById('inv_imagen_url').value
  };

  try {
    const response = await fetch('/inventario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (response.ok) {
      document.getElementById('inventoryForm').reset();
      removeImage();
      alert('¡Artículo agregado al inventario!');
      if (currentCategory === formData.categoria) loadInventory(currentCategory);
    }
  } catch (error) {
    alert('Error al agregar artículo');
  }
});

document.getElementById('resetInventoryForm').addEventListener('click', () => {
  document.getElementById('inventoryForm').reset();
  removeImage();
});

async function markAsSold(itemId) {
  const precio = prompt('Ingresa el precio de venta:');
  if (!precio) return;
  try {
    const response = await fetch(`/inventario/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'vendido', precio_venta: parseFloat(precio) })
    });
    if (response.ok) {
      alert('¡Artículo marcado como vendido!');
      loadInventory(currentCategory);
    }
  } catch (error) {
    alert('Error al actualizar');
  }
}

async function deleteInventoryItem(itemId) {
  if (!confirm('¿Eliminar este artículo del inventario?')) return;
  try {
    const response = await fetch(`/inventario/${itemId}`, { method: 'DELETE' });
    if (response.ok) {
      alert('Artículo eliminado');
      loadInventory(currentCategory);
    }
  } catch (error) {
    alert('Error al eliminar');
  }
}

// ============================================================
// ESTADÍSTICAS
// ============================================================

async function loadEstadisticas() {
  try {
    const response = await fetch('/estadisticas');
    const stats = await response.json();

    document.getElementById('totalCompras').textContent = `$${stats.totalCompras.toFixed(2)}`;
    document.getElementById('totalVentas').textContent = `$${stats.totalVentas.toFixed(2)}`;
    document.getElementById('ganancia').textContent = `$${stats.ganancia.toFixed(2)}`;
    document.getElementById('productosDisponibles').textContent = stats.productosDisponibles;
    document.getElementById('productosVendidos').textContent = stats.productosVendidos;

    const categorias = {};
    stats.inventarioPorCategoria.forEach(item => {
      if (!categorias[item.categoria]) categorias[item.categoria] = { disponible: 0, vendido: 0, reservado: 0 };
      categorias[item.categoria][item.estado] = item.cantidad;
    });

    document.getElementById('categoryStats').innerHTML = Object.keys(categorias).map(cat => `
      <div class="category-item">
        <strong>${cat.charAt(0).toUpperCase() + cat.slice(1)}</strong>
        <span>Disponible: ${categorias[cat].disponible || 0} | Vendido: ${categorias[cat].vendido || 0} | Reservado: ${categorias[cat].reservado || 0}</span>
      </div>
    `).join('') || '<p style="text-align:center;color:#999;">Sin datos</p>';
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

// ============================================================
// CONSULTAS DE CLIENTES
// ============================================================

function showInterestForm(productoId, productoNombre, categoria) {
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = `
    <h2>Estoy Interesado</h2>
    <h3>${productoNombre}</h3>
    <p style="color:#666;margin-bottom:20px;">Complete el formulario y nos pondremos en contacto</p>
    <form class="bid-form" id="interestForm">
      <input type="text" id="nombre_cliente" placeholder="Su nombre completo" required>
      <input type="email" id="email_cliente" placeholder="Email" required>
      <input type="tel" id="telefono_cliente" placeholder="Teléfono" required>
      <textarea id="mensaje_cliente" placeholder="Mensaje (opcional)" rows="3"></textarea>
      <button type="submit">Enviar consulta</button>
    </form>
  `;
  document.getElementById('modal').style.display = 'block';
  document.getElementById('interestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitInterest(productoId, productoNombre, categoria);
  });
}

async function submitInterest(productoId, productoNombre, categoria) {
  const consultaData = {
    producto_id: productoId,
    producto_nombre: productoNombre,
    categoria,
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
      alert('¡Gracias por su interés! Nos pondremos en contacto pronto.');
      closeModal();
    }
  } catch (error) {
    alert('Error al enviar la consulta');
  }
}

async function loadConsultas() {
  try {
    const response = await fetch('/consultas');
    const consultas = await response.json();
    renderConsultas(consultas);
  } catch (error) {
    console.error('Error cargando consultas:', error);
  }
}

function renderConsultas(consultas) {
  const consultasList = document.getElementById('consultasList');
  if (consultas.length === 0) {
    consultasList.innerHTML = '<p style="text-align:center;color:#999;">Sin consultas aún</p>';
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
        ${consulta.estado === 'pendiente' ? `<button onclick="updateConsultaStatus(${consulta.id}, 'contactado')">Marcar Contactado</button>` : ''}
        ${consulta.estado === 'contactado' ? `<button onclick="updateConsultaStatus(${consulta.id}, 'completado')">Marcar Completado</button>` : ''}
        <button class="delete-btn" onclick="updateConsultaStatus(${consulta.id}, 'archivado')">Archivar</button>
      </div>
    </div>
  `).join('');
}

async function updateConsultaStatus(consultaId, nuevoEstado) {
  try {
    await fetch(`/consulta/${consultaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    loadConsultas();
  } catch (error) {
    console.error('Error actualizando consulta:', error);
  }
}

// ============================================================
// NAVEGACIÓN
// ============================================================

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.section;
    if (!section) return;

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
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

// ============================================================
// MODAL
// ============================================================

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

document.querySelector('.close').addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal')) closeModal();
});

// ============================================================
// INICIO
// ============================================================

loadProducts();
setInterval(loadProducts, 30000);
