# 🚀 Guía de Deployment en Render.com

## Paso 1: Preparar GitHub

### 1.1 Crear cuenta en GitHub (si no tienes)
- Ve a https://github.com
- Click en "Sign up"
- Completa el registro

### 1.2 Instalar Git en tu computadora
- Descarga Git desde: https://git-scm.com/download/win
- Instala con las opciones por defecto
- Reinicia tu terminal

### 1.3 Configurar Git (primera vez)
Abre una terminal y ejecuta:
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

### 1.4 Crear repositorio en GitHub
1. Ve a https://github.com
2. Click en el botón "+" arriba a la derecha
3. Selecciona "New repository"
4. Nombre: `vintage-tienda-auction`
5. Descripción: "Plataforma de subastas de antigüedades"
6. Selecciona "Public"
7. NO marques "Initialize with README"
8. Click en "Create repository"

### 1.5 Subir tu proyecto a GitHub
En tu terminal, dentro de la carpeta del proyecto:

```bash
# Inicializar repositorio Git
git init

# Agregar todos los archivos
git add .

# Hacer el primer commit
git commit -m "Initial commit - Vintage Tienda Platform"

# Conectar con GitHub (reemplaza TU-USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU-USUARIO/vintage-tienda-auction.git

# Subir el código
git branch -M main
git push -u origin main
```

**Nota:** GitHub te pedirá autenticación. Usa tu usuario y contraseña de GitHub.

---

## Paso 2: Configurar Render.com

### 2.1 Crear cuenta en Render
- Ve a https://render.com
- Click en "Get Started"
- Puedes registrarte con tu cuenta de GitHub (recomendado)

### 2.2 Crear nuevo Web Service
1. En el dashboard de Render, click en "New +"
2. Selecciona "Web Service"
3. Click en "Connect account" para conectar GitHub
4. Autoriza a Render para acceder a tus repositorios
5. Busca y selecciona `vintage-tienda-auction`
6. Click en "Connect"

### 2.3 Configurar el servicio
Completa los campos:

- **Name:** `vintage-tienda` (o el nombre que prefieras)
- **Region:** Selecciona la más cercana (ej: Oregon, USA)
- **Branch:** `main`
- **Root Directory:** (dejar vacío)
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** Selecciona "Free"

### 2.4 Variables de entorno (opcional)
Si quieres cambiar la contraseña de admin:
- Click en "Advanced"
- Click en "Add Environment Variable"
- Key: `ADMIN_PASSWORD`
- Value: `tu-nueva-contraseña`

### 2.5 Deploy
- Click en "Create Web Service"
- Render comenzará a construir y desplegar tu aplicación
- Esto tomará 2-5 minutos

### 2.6 Obtener tu URL
Una vez completado el deploy:
- Verás un mensaje "Live" en verde
- Tu URL será algo como: `https://vintage-tienda.onrender.com`
- ¡Copia esta URL y compártela con tus amigos!

---

## Paso 3: Agregar Datos de Ejemplo

### 3.1 Acceder al Shell de Render
1. En tu servicio de Render, ve a la pestaña "Shell"
2. Click en "Launch Shell"
3. Ejecuta:
```bash
npm run seed
```

Esto agregará los 15 productos de ejemplo a tu base de datos.

---

## Paso 4: Usar tu Aplicación en Producción

### Como Administrador:
1. Abre tu URL: `https://vintage-tienda.onrender.com`
2. Click en "Admin Login"
3. Usuario: `admin`
4. Contraseña: `vintage2026` (o la que configuraste)
5. Agrega productos, gestiona inventario, ve contabilidad

### Compartir con Amigos:
- Simplemente envíales la URL
- Ellos pueden ver productos y hacer consultas
- NO pueden ver precios de compra ni contabilidad
- NO pueden agregar/editar productos

---

## Paso 5: Actualizar tu Aplicación

Cuando hagas cambios en tu código local:

```bash
# Agregar cambios
git add .

# Hacer commit
git commit -m "Descripción de los cambios"

# Subir a GitHub
git push

# Render detectará los cambios y actualizará automáticamente
```

---

## 🎯 Notas Importantes:

### Base de Datos
- Render usa almacenamiento efímero en el plan gratuito
- Los datos se mantienen mientras el servicio esté activo
- Si el servicio se detiene por inactividad (15 min sin uso), los datos persisten
- Para datos permanentes 100%, considera actualizar a plan de pago ($7/mes)

### Primer Acceso
- La primera vez que alguien acceda después de inactividad, puede tardar 30-60 segundos
- Esto es normal en el plan gratuito de Render

### Límites del Plan Gratuito
- 750 horas/mes (suficiente para uso normal)
- El servicio se "duerme" después de 15 min sin actividad
- Se "despierta" automáticamente cuando alguien accede

---

## 🆘 Solución de Problemas

### Error: "Build failed"
- Verifica que todos los archivos estén en GitHub
- Revisa los logs en Render para ver el error específico

### Error: "Application failed to respond"
- Verifica que el puerto esté configurado correctamente (process.env.PORT)
- Revisa los logs en la pestaña "Logs" de Render

### No puedo hacer login
- Verifica que la contraseña sea correcta
- Limpia el caché del navegador (Ctrl+Shift+Delete)

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Render (pestaña "Logs")
2. Verifica que el código esté en GitHub
3. Asegúrate de que `package.json` tenga todas las dependencias

---

## ✅ Checklist Final

- [ ] Código subido a GitHub
- [ ] Servicio creado en Render
- [ ] Deploy completado (estado "Live")
- [ ] Datos de ejemplo agregados (npm run seed)
- [ ] Login de admin funciona
- [ ] URL compartida con amigos
- [ ] Probado agregar productos
- [ ] Probado sistema de consultas

---

¡Felicidades! Tu plataforma Vintage Tienda está en línea y lista para usar. 🎉
