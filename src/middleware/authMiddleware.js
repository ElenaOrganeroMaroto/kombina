const userData = require('../data/userData');
const userLogic = require('../logic/userLogic');

// Middleware para verificar que el usuario ha iniciado sesión (sesión válida)
const verifyAuth = async (req, res, next) => {
  try {
    // Por ejemplo, podemos recibir el email del usuario en las cabeceras (headers) o en la sesión
    const userEmail = req.headers['x-user-email'] || (req.body && req.body.email);

    if (!userEmail) {
      return res.status(401).json({ error: 'Acceso denegado: se requiere una sesión válida.' });
    }

    // findUserByEmail es asíncrona: hay que esperar el resultado con await
    const user = await userData.findUserByEmail(userEmail);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Sesión no válida o usuario inactivo.' });
    }

    // Adjuntamos el usuario a la petición para usarlo en el endpoint si hace falta
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Middleware para verificar que el usuario es administrador
const verifyAdmin = async (req, res, next) => {
  // Primero aseguramos que está autenticado
  await verifyAuth(req, res, () => {
    try {
      // Usamos tu función de lógica existente
      userLogic.adminActionCheck(req.user.role);
      next();
    } catch (error) {
      return res.status(403).json({ error: error.message });
    }
  });
};

module.exports = { verifyAuth, verifyAdmin };