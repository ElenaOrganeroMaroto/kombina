const userData = require('../data/userData');
const userLogic = require('../logic/userLogic');

// Middleware para verificar que el usuario ha iniciado sesión (sesión válida)
const verifyAuth = (req, res, next) => {
  // Por ejemplo, podemos recibir el email del usuario en las cabeceras (headers) o en la sesión
  const userEmail = req.headers['x-user-email'] || req.body.email;

  if (!userEmail) {
    return res.status(401).json({ error: 'Acceso denegado: se requiere una sesión válida.' });
  }

  const user = userData.findUserByEmail(userEmail);
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Sesión no válida o usuario inactivo.' });
  }

  // Adjuntamos el usuario a la petición para usarlo en el endpoint si hace falta
  req.user = user;
  next();
};

// Middleware para verificar que el usuario es administrador
const verifyAdmin = (req, res, next) => {
  try {
    // Primero aseguramos que está autenticado
    verifyAuth(req, res, () => {
      // Usamos tu función de lógica existente
      userLogic.adminActionCheck(req.user.role);
      next();
    });
  } catch (error) {
    return res.status(403).json({ error: error.message });
  }
};

module.exports = { verifyAuth, verifyAdmin };