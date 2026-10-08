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