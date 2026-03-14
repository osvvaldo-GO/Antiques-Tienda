# 🏺 Antiques Tienda - Contexto del Proyecto

## Descripción
Plataforma full-stack de subastas y tienda de antigüedades, arte y muebles usados.
Proyecto académico universitario en desarrollo activo.

## Stack Tecnológico
- Backend: Node.js + Express
- Base de datos: SQLite (database.sqlite)
- Frontend: HTML + CSS + Vanilla JavaScript
- Puerto local: 4000 (http://localhost:4000)

## Estructura de Archivos
```
PROYECTOS KIRO/
├── server.js          # Servidor principal
├── package.json       # Dependencias
├── seed-data.js       # Datos de ejemplo
├── render.yaml        # Configuración para Render.com
├── database.sqlite    # Base de datos (se crea automáticamente)
├── .gitignore
├── DEPLOYMENT.md      # Guía de deployment
├── PROYECTO.md        # Este archivo
├── public/
│   ├── index.html     # Página principal
│   ├── style.css      # Estilos
│   ├── script.js      # Lógica del cliente
│   └── auth.js        # Sistema de autenticación
└── imagenes/          # Imágenes de productos (ej: reloj-1920.jpg)
```

## Credenciales de Administrador
- Usuario: admin
- Contraseña: vintage2026
- URL local: http://localhost:4000

## Funcionalidades Implementadas

### ✅ Sistema de Subastas
- Publicar artículos con precio inicial y duración configurable
- Temporizador en tiempo real con cuenta regresiva
- Sistema de pujas con código de pujador autogenerado
- Detección automática de ganador al terminar el tiempo
- Historial de pujas en orden descendente
- Pantalla de ganador con información completa

### ✅ Secciones de Inventario
- Vitrina de Exhibición (antigüedades)
- Muebles
- Libros
- Cada sección con gestión completa de inventario

### ✅ Sistema de Autenticación
- Login de administrador (admin/vintage2026)
- Sesiones con sessionId almacenado en localStorage
- Vistas diferenciadas: público vs administrador

### ✅ Vista Pública (sin login)
- Ve productos disponibles (NO los vendidos)
- Solo ve precio de VENTA (NO precio de compra)
- Botón "Estoy Interesado" para contactar
- Puede pujar en subastas

### ✅ Vista Administrador (con login)
- Ve precio de compra Y precio de venta
- Ve ganancia por producto
- Panel de administración completo
- Botón "Contabilidad" (solo admin)
- Botón "Consultas" (solo admin)
- Puede agregar/editar/eliminar productos
- Puede marcar productos como vendidos

### ✅ Sistema Contable
- Total de compras
- Total de ventas
- Ganancia neta
- Estadísticas por categoría
- Solo visible para administrador

### ✅ Sistema de Consultas
- Clientes envían formulario de interés
- Admin ve todas las consultas
- Estados: Pendiente → Contactado → Completado → Archivado

### ✅ Diseño
- Tema aqua blue (#00bcd4)
- Logo SVG: letras A+T fusionadas (A estilizada con barra horizontal extendida)
- Nombre: "Antiques Tienda"
- Banner hero con imagen institucional (ImágenAnticuario.jpg)
- Diseño responsive

## API REST Implementada
- GET /productos - Listar productos de subasta
- POST /subir-producto - Publicar producto en subasta
- POST /pujar - Realizar puja
- GET /historial/:id - Historial de pujas
- POST /borrar-historial - Limpiar historial
- DELETE /producto/:id - Eliminar producto
- GET /inventario?categoria= - Listar inventario (público/admin)
- POST /inventario - Agregar al inventario (admin)
- PUT /inventario/:id - Actualizar estado (admin)
- DELETE /inventario/:id - Eliminar del inventario (admin)
- GET /estadisticas - Estadísticas contables (admin)
- POST /consulta - Enviar consulta de interés (público)
- GET /consultas - Ver todas las consultas (admin)
- PUT /consulta/:id - Actualizar estado consulta (admin)
- POST /login - Autenticación admin
- POST /logout - Cerrar sesión
- GET /check-auth - Verificar sesión

## Base de Datos (SQLite)
Tablas:
- productos - Artículos en subasta
- pujas - Historial de pujas
- inventario - Stock de la tienda
- transacciones - Registro contable
- consultas - Consultas de clientes interesados

## Imágenes
- Carpeta: /imagenes/ (en raíz del proyecto)
- Imagen institucional: ImágenAnticuario.jpg
- Productos: reloj-1920.jpg, etc.
- Nota: nombres sin espacios (usar guiones)

## Comandos
```bash
npm start        # Iniciar servidor en puerto 4000
npm run seed     # Cargar datos de ejemplo (15 productos)
```

## Pendiente por Implementar
- [ ] Publicación en internet (GitHub + Render.com o Ngrok)
- [ ] Ajuste fino del logo (pata derecha de la A más curvilínea)
- [ ] Sistema de registro de clientes (opcional)
- [ ] Carrito de compras (opcional, para futuro)

## Notas Importantes
- El archivo database.sqlite NO se sube a GitHub (.gitignore)
- Las imágenes están en /imagenes/ (NO en /public/)
- El servidor sirve /imagenes/ como estático
- En Render.com, los datos persisten mientras el servicio esté activo
- Plan gratuito de Render: se "duerme" tras 15 min de inactividad

## Próximos Pasos
1. Publicar en internet con Ngrok (temporal) o Render (permanente)
2. Cargar stock real de productos
3. Compartir URL con clientes y amigos
