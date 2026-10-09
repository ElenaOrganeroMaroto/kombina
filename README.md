# Kombina

Aplicación web con registro de usuarios, confirmación de cuenta por correo, inicio de sesión con Google (OAuth 2.0), roles de usuario y administrador, y registro de actividad.

Despliegue en producción: <https://kombina.onrender.com>

## Tecnologías

| Tecnología | Por qué la hemos elegido |
|---|---|
| **Node.js** | Permite usar JavaScript en servidor y cliente, con un ecosistema amplio de librerías y herramientas de prueba. |
| **Express** | Framework ligero y muy extendido para definir la API REST y los middlewares de autenticación y autorización. |
| **MongoDB Atlas + Mongoose** | Base de datos documental gestionada en la nube, sin servidor propio que mantener, con modelos y validaciones sencillas desde Mongoose. |
| **Jest + Supertest** | Jest ejecuta las pruebas y los mocks, y Supertest permite probar la API HTTP completa sin levantar el servidor manualmente. |
| **Google OAuth 2.0** | Permite iniciar sesión con una cuenta de Google sin gestionar contraseñas adicionales, validando el correo verificado del perfil. |
| **Brevo (API HTTP)** | Servicio de correo transaccional con plan gratuito que se usa por API HTTPS, porque Render bloquea los puertos SMTP en el plan gratuito. |
| **Render** | Plataforma de despliegue con auto-deploy desde GitHub y gestión de variables de entorno, sin configurar infraestructura. |

## Ejecutar el proyecto en local

Requisitos: Node.js 18 o superior y una base de datos MongoDB (local o un clúster de MongoDB Atlas).

1. Clona el repositorio e instala las dependencias:

   ```bash
   git clone https://github.com/ElenaOrganeroMaroto/kombina.git
   cd kombina
   npm install
   ```

2. Crea tu archivo de entorno a partir de la plantilla y rellena los valores (ver [Variables de entorno](#variables-de-entorno)):

   ```bash
   cp .env.example .env
   ```

   En Windows (PowerShell): `Copy-Item .env.example .env`

3. Arranca el servidor:

   ```bash
   npm start
   ```

4. Abre <http://localhost:3000> (con `PUBLIC_URL=http://localhost:3000`).

Para probar el inicio de sesión con Google en local, registra también `http://localhost:3000/api/auth/google/callback` como URI de redirección autorizada en Google Cloud Console.

## Ejecutar las pruebas

```bash
npm test
```

Las pruebas borran todos los usuarios de la base de datos, por lo que **solo se ejecutan contra una base cuyo nombre contenga `test`**. Si no es así, fallan a propósito para proteger los datos reales. Ejemplo:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/kombina_test npm test
```

En Windows (PowerShell):

```powershell
$env:MONGODB_URI="mongodb://127.0.0.1:27017/kombina_test"; npm test
```

El envío de correo y la verificación de Google están mockeados en los tests, así que no hacen falta claves reales de Brevo ni de Google para ejecutarlos.

## Variables de entorno

Solo se indican los nombres. Los valores se configuran en el archivo `.env` (local) o en el panel de Render (producción). **No subas `.env` ni claves al repositorio**: la plantilla está en `.env.example`.

| Variable | Uso |
|---|---|
| `MONGODB_URI` | Cadena de conexión a MongoDB. |
| `PUBLIC_URL` | URL pública de la aplicación; se usa en los enlaces de confirmación y en el callback de OAuth. |
| `SESSION_SECRET` | Secreto largo y aleatorio que firma las sesiones y el estado de OAuth. Debe ser estable entre despliegues. |
| `GOOGLE_CLIENT_ID` | Identificador del cliente OAuth de Google. |
| `GOOGLE_CLIENT_SECRET` | Secreto del cliente OAuth de Google. |
| `BREVO_API_KEY` | Clave de la API de Brevo para enviar correos. |
| `EMAIL_FROM` | Dirección remitente, que debe estar verificada como remitente en Brevo. |

## Acceso como administrador para la revisión

Los usuarios se registran siempre con rol `user` y pendientes de confirmación. El primer administrador no se crea desde la web, sino mediante promoción manual en MongoDB, una operación reservada a quien tenga acceso administrativo a la base de datos.

Las credenciales de la cuenta de administrador de prueba **no están en este repositorio**: se envían junto con la entrega.

Si necesitas crear tu propio administrador, registra una cuenta, confirma el correo y promociónala con `mongosh`:

```javascript
db.users.updateOne(
  { email: "admin@ejemplo.es" },
  { $set: { role: "admin", isActive: true } }
)
```

Con esa cuenta se pueden usar las rutas administrativas:

- `GET /api/admin/users`: lista de usuarios (email, rol y estado; nunca la contraseña).
- `GET /api/admin/users/:userId/status`: estado activo de un usuario.
- `DELETE /api/account`: un administrador puede borrar cualquier cuenta; un usuario normal, solo la suya.

## Seguridad y funcionamiento

- **Roles:** el cliente no puede asignarse `role` ni `isActive` al registrarse.
- **Sesiones:** cookie `HttpOnly` válida durante siete días. El logout incrementa la versión de sesión en MongoDB y revoca también los tokens anteriores.
- **Confirmación de correo:** el registro local envía un enlace válido durante 24 horas. El token se guarda hasheado y es de un solo uso. El enlace muestra una página intermedia: un `GET` automático (por ejemplo, de un escáner de Outlook) no consume el token; la cuenta se confirma al pulsar el botón, que envía un `POST`.
- **OAuth con Google:** se valida el parámetro `state`, el código se intercambia en el servidor y solo se aceptan perfiles con correo verificado.
- **Registro de actividad:** el servidor escribe en `stdout` una línea JSON por cada operación que modifica datos y por cada consulta administrativa, con fecha, acción, resultado HTTP y, si está autenticado, identificador y rol del actor. No se registran cuerpos de petición, correos, contraseñas, tokens ni parámetros de consulta.

## Despliegue en Render

1. Conecta el repositorio de GitHub a un servicio web de Render (comando de arranque: `npm start`).
2. Configura las variables de entorno de la tabla anterior en **Environment**, con `PUBLIC_URL=https://kombina.onrender.com`.
3. Añade `https://kombina.onrender.com/api/auth/google/callback` como URI de redirección autorizada en Google Cloud Console.
4. Verifica la dirección de `EMAIL_FROM` como remitente en Brevo.

Nota: el plan gratuito de Render bloquea el tráfico saliente a los puertos SMTP, por eso el correo se envía con la API HTTP de Brevo.