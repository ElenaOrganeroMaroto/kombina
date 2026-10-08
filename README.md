# kombina

## Roles y administración

Los usuarios se registran siempre con rol `user` y pendientes de confirmación (`isActive: false`); el cliente no puede asignar estos campos. El login devuelve un token firmado con `SESSION_SECRET`, válido durante siete días. Configura `SESSION_SECRET` en el entorno del servidor para conservar la validez de las sesiones entre reinicios. Si no se configura, se genera una clave aleatoria al iniciar y los tokens dejan de ser válidos al reiniciar.

El primer administrador se crea mediante promoción manual en MongoDB, una operación reservada a quien tenga acceso administrativo a la base de datos. Tras registrar la cuenta y verificar su titularidad por el procedimiento del proyecto, se puede activar y promover con `mongosh`:

```javascript
db.users.updateOne(
	{ email: "admin@ejemplo.es" },
	{ $set: { role: "admin", isActive: true } }
)
```

Solo un token de un usuario con rol `admin` puede consultar `GET /api/admin/users`, consultar `GET /api/admin/users/:userId/status` o usar las rutas administrativas. El listado devuelve email, rol y estado, nunca la contraseña. La eliminación de cuenta permite al administrador borrar cualquier cuenta y a un usuario normal solo la suya; las cuentas eliminadas se borran de la base de datos y no pueden volver a iniciar sesión.

## Registro de actividad

El servidor emite una línea JSON por cada operación que modifica datos de la API y por cada consulta administrativa. Cada evento contiene fecha, acción, resultado HTTP y, cuando está autenticado, el identificador y rol del actor. No se registran cuerpos de petición, emails, contraseñas, tokens ni parámetros de consulta. Los eventos se escriben en `stdout`, para que puedan ser recogidos por el entorno donde se ejecute el servidor.

## OAuth y confirmación de correo

Configura estas variables en el entorno del servidor; no subas `.env` ni claves al repositorio. La plantilla está en `.env.example`:

- `PUBLIC_URL`: `http://localhost:3000` en desarrollo y `https://kombina.onrender.com` en Render.
- `SESSION_SECRET`: secreto aleatorio largo y estable entre despliegues; firma sesiones y el estado OAuth.
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`: credenciales de un cliente OAuth de tipo aplicación web.
- `RESEND_API_KEY` y `EMAIL_FROM`: clave de Resend y dirección remitente de un dominio verificado en Resend.

En Google Cloud Console, añade como URI de redirección autorizada `https://kombina.onrender.com/api/auth/google/callback`. Para pruebas locales, registra también `http://localhost:3000/api/auth/google/callback`. El flujo valida `state`, intercambia el código en el servidor y solo acepta perfiles con email verificado.

El registro local envía un enlace de confirmación válido durante 24 horas. El token se almacena hasheado y solo puede utilizarse una vez; la cuenta no inicia sesión hasta confirmarse. Resend requiere que `EMAIL_FROM` pertenezca a un dominio verificado.

Las sesiones se mantienen en una cookie `HttpOnly` durante siete días. El endpoint de logout incrementa la versión de sesión en MongoDB y revoca también tokens anteriores. Las pruebas se ejecutan con `npm test` y requieren una base de datos cuyo nombre contenga `test`, por ejemplo `mongodb://127.0.0.1:27017/kombina_test`.

## OAuth y confirmación de correo

Configura estas variables en el entorno del servidor; no subas `.env` ni claves al repositorio:

- `PUBLIC_URL`: `http://localhost:3000` en desarrollo y `https://kombina.onrender.com` en Render.
- `SESSION_SECRET`: secreto aleatorio largo y estable entre despliegues; firma sesiones y el estado OAuth.
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`: credenciales de un cliente OAuth de tipo aplicación web.
- `RESEND_API_KEY` y `EMAIL_FROM`: clave de Resend y dirección remitente de un dominio verificado en Resend.

En Google Cloud Console, añade como URI de redirección autorizada `${PUBLIC_URL}/api/auth/google/callback`. Registra por separado `http://localhost:3000/api/auth/google/callback` para desarrollo y `https://kombina.onrender.com/api/auth/google/callback` para Render. El inicio OAuth valida `state`, intercambia el código en el servidor y acepta únicamente perfiles con email verificado.

El registro local envía un enlace de confirmación válido durante 24 horas. El token se almacena hasheado y solo puede utilizarse una vez; la cuenta no inicia sesión hasta confirmar. El enlace muestra una página intermedia: un `GET` automático de Outlook u otro escáner no activa ni consume el token; la confirmación se realiza al pulsar el botón, que envía un `POST`. Resend requiere que `EMAIL_FROM` pertenezca a un dominio verificado.

Las sesiones se mantienen en una cookie `HttpOnly` durante siete días. El endpoint de logout incrementa la versión de sesión en MongoDB y revoca también los tokens anteriores. Las pruebas automatizadas se ejecutan con `npm test` y requieren una base de datos cuyo nombre contenga `test`, por ejemplo `mongodb://127.0.0.1:27017/kombina_test`.