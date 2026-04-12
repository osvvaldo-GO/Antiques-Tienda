# 🏺 Antiques Tienda - Documento de Contexto del Proyecto

## ⚠️ INSTRUCCIONES PARA KIRO
Si estás leyendo esto en una nueva conversación, este documento contiene
todo el contexto necesario para retomar el proyecto exactamente donde se dejó.
El usuario es Oswaldo, estudiante universitario, proyecto académico.

---

## 📌 Datos del Proyecto

- **Nombre:** Antiques Tienda
- **Descripción:** Plataforma full-stack de subastas y tienda de antigüedades, arte y muebles usados
- **Tipo:** Proyecto académico universitario (práctica profesional)
- **Estado:** En producción ✅
- **URL en producción:** https://antiques-tienda.onrender.com
- **URL local:** http://localhost:4000

---

## 🔐 Credenciales

- **Admin usuario:** admin
- **Admin contraseña:** guardada como hash bcrypt en `.env` (ADMIN_PASSWORD_HASH) — NO en texto plano
- **Recuperación:** usar endpoint `/generate-hash` con el EMERGENCY_TOKEN del `.env`
- **GitHub usuario:** osvvaldo-GO
- **GitHub repositorio:** https://github.com/osvvaldo-GO/Antiques-Tienda
- **Render servicio:** antiques-tienda (ID: SRV-D6RKL40GJCHC73BboIF0)
- **Render email:** o.grajales51@pascualbravo.edu.co

---

## 🛠️ Stack Tecnológico

- **Backend:** Node.js + Express
- **Base de datos:** SQLite (database.sqlite)
- **Frontend:** HTML + CSS + Vanilla JavaScript
- **Hosting:** Render.com (plan gratuito)
- **Repositorio:** GitHub

---

## 📁 Estructura de Archivos

```
PROYECTOS KIRO/
├── server.js              # Servidor principal (Express + SQLite)
├── package.json           # Dependencias y scripts
├── seed-data.js           # Script para cargar datos de ejemplo
├── render.yaml            # Configuración para Render.com
├── database.sqlite        # Base de datos local (NO subir a GitHub)
├── .gitignore             # Archivos ignorados por Git
├── DEPLOYMENT.md          # Guía detallada de deployment
├── PROYECTO.md            # Este archivo (contexto del proyecto)
├── public/
│   ├── index.html         # Página principal
│   ├── style.css          # Estilos (tema aqua blue #00bcd4)
│   ├── script.js          # Lógica del cliente
│   └── auth.js            # Sistema de autenticación
└── imagenes/              # Imágenes locales de productos
    └── ImágenAnticuario.jpg  # Imagen institucional del hero banner
```

---

## ✅ Funcionalidades Implementadas

### Sistema de Subastas
- Publicar artículos con precio inicial y duración configurable en minutos
- Temporizador en tiempo real con cuenta regresiva
- Sistema de pujas con código de pujador autogenerado (BIDxxxxxxx)
- Detección automática de ganador al terminar el tiempo
- Pantalla de ganador con información completa
- Historial de pujas en orden descendente
- Botón para limpiar historial

### Secciones de Inventario
- Vitrina de Exhibición (antigüedades)
- Muebles
- Libros
- Cada sección con gestión completa de inventario
- Estados: Disponible, Vendido, Reservado

### Sistema de Autenticación
- Login de administrador (admin/vintage2026)
- Sesiones con sessionId en localStorage
- Override de fetch para incluir sessionId automáticamente
- Vistas diferenciadas: público vs administrador

### Vista Pública (sin login)
- Ve productos disponibles (NO los vendidos)
- Solo ve precio de VENTA (NO precio de compra)
- Botón "Estoy Interesado" para contactar al admin
- Puede pujar en subastas libremente

### Vista Administrador (con login)
- Ve precio de compra Y precio de venta
- Ve ganancia por producto vendido
- Panel de administración completo
- Botón "Contabilidad" (solo admin)
- Botón "Consultas" (solo admin)
- Puede agregar/editar/eliminar productos
- Puede marcar productos como vendidos

### Sistema Contable
- Total de compras
- Total de ventas
- Ganancia neta
- Estadísticas por categoría
- Solo visible para administrador

### Sistema de Consultas de Clientes
- Clientes envían formulario (nombre, email, teléfono, mensaje)
- Admin ve todas las consultas
- Estados: Pendiente → Contactado → Completado → Archivado

### Diseño
- Tema aqua blue (#00bcd4)
- Logo SVG: letras A+T fusionadas (A estilizada con barra horizontal extendida al estilo Coca-Cola)
- Nombre: "Antiques Tienda"
- Banner hero con imagen institucional (ImágenAnticuario.jpg)
- Diseño responsive (móvil y escritorio)

---

## 🗄️ Base de Datos (SQLite)

### Tablas:
- **productos** - Artículos en subasta (nombre, descripcion, precio_inicial, duracion, fecha_inicio, imagen)
- **pujas** - Historial de pujas (producto_id, apodo, codigo, email, telefono, monto, fecha)
- **inventario** - Stock de la tienda (nombre, descripcion, categoria, precio_compra, precio_venta, estado, imagen, fecha_ingreso, fecha_venta)
- **transacciones** - Registro contable (inventario_id, tipo, monto, descripcion, fecha)
- **consultas** - Consultas de clientes (producto_id, producto_nombre, categoria, nombre_cliente, email, telefono, mensaje, fecha, estado)

---

## 🌐 API REST

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | /productos | Listar productos subasta | No |
| POST | /subir-producto | Publicar en subasta | No |
| POST | /pujar | Realizar puja | No |
| GET | /historial/:id | Historial de pujas | No |
| POST | /borrar-historial | Limpiar historial | No |
| DELETE | /producto/:id | Eliminar producto subasta | No |
| GET | /inventario?categoria= | Listar inventario | No (filtra datos) |
| POST | /inventario | Agregar al inventario | Sí |
| PUT | /inventario/:id | Actualizar estado | Sí |
| DELETE | /inventario/:id | Eliminar del inventario | Sí |
| GET | /estadisticas | Estadísticas contables | Sí |
| POST | /consulta | Enviar consulta | No |
| GET | /consultas | Ver todas las consultas | Sí |
| PUT | /consulta/:id | Actualizar estado consulta | Sí |
| POST | /login | Autenticación admin | No |
| POST | /logout | Cerrar sesión | No |
| GET | /check-auth | Verificar sesión | No |

---

## 💻 Comandos Útiles

```bash
# Iniciar servidor local
npm start

# Cargar datos de ejemplo (15 productos)
npm run seed

# Subir cambios a GitHub (y Render actualiza automáticamente)
git add .
git commit -m "descripción del cambio"
git push
```

---

## ⚠️ Limitaciones Actuales (Pendiente Resolver)

### Imágenes en Producción
- Render plan gratuito tiene almacenamiento efímero
- Las imágenes locales NO persisten en producción
- **Solución pendiente:** Integrar Cloudinary (gratis, 25GB)
- **Solución temporal:** Usar URLs externas (Imgur.com)

### Plan Gratuito Render
- El servicio se "duerme" tras 15 min de inactividad
- Primera carga puede tardar 30-60 segundos
- Para evitarlo: upgrade a $7/mes

---

## 📋 Pendiente por Implementar

- [x] **Cloudinary** - Sistema profesional de imágenes ✅ (integrado)
- [ ] Ajuste fino del logo (pata derecha de la A más curvilínea)
- [ ] Sistema de registro de clientes (opcional)
- [ ] Carrito de compras (opcional, para futuro)
- [ ] Notificaciones por email al admin cuando llega una consulta

---

## 🚀 Cómo Retomar Este Proyecto

Cuando inicies una nueva conversación con Kiro, escribe:

> "Kiro, tengo un proyecto en desarrollo llamado Antiques Tienda.
> Lee el archivo PROYECTO.md y retomemos donde estábamos."

Kiro leerá este documento y estará al tanto de todo el contexto,
el estado actual y lo que falta por implementar.

---

## 📝 Historial de Sesiones

### Sesión 1
- Creación del proyecto base (subastas, inventario, contabilidad)
- Sistema de autenticación admin
- Diseño responsive aqua blue
- Logo A+T fusionadas

### Sesión 2
- Corrección de imágenes (carpeta /imagenes/)
- Banner hero institucional
- Cambio nombre a "Antiques Tienda"
- Sistema de consultas de clientes
- Precios de compra ocultos al público
- Publicación en GitHub + Render.com
- URL en producción: https://antiques-tienda.onrender.com

### Sesión 3
- Mejoras de seguridad: contraseña ahora usa hash bcrypt (nunca en texto plano)
- Eliminados console.log que exponían credenciales en logs
- Servidor falla al arrancar si faltan variables de entorno (más seguro)
- Agregado endpoint /generate-hash para recuperación de emergencia

### Credenciales de acceso (guardar en lugar seguro)
- **URL local:** http://localhost:4000
- **URL producción:** https://antiques-tienda.onrender.com
- **Admin usuario:** admin
- **Admin contraseña:** vintage2026
- **EMERGENCY_TOKEN:** CosaPeluda-2003 (para generar nuevo hash si olvidas la contraseña)

### Cómo recuperar acceso si olvidas la contraseña
1. Inicia el servidor: `npm start`
2. En otra terminal ejecuta:
```powershell
Invoke-RestMethod -Uri http://localhost:4000/generate-hash -Method POST -ContentType "application/json" -Body '{"password":"nueva_contraseña","emergency_token":"CosaPeluda-2003"}'
```
3. Copia el hash que devuelve y ponlo en `.env` como `ADMIN_PASSWORD_HASH`
4. Reinicia el servidor

### Sesión 4
- Integración de Cloudinary para imágenes persistentes en producción
- Fix de Content Security Policy (helmet) para permitir imágenes externas y handlers inline
- Preview de imágenes ampliado a 400px
