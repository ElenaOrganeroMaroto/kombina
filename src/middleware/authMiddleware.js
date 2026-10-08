const userData = require('../data/userData');
const userLogic = require('../logic/userLogic');
const { verifySessionToken } = require('../logic/sessionToken');
const { SESSION_COOKIE_NAME, readCookie } = require('../logic/sessionCookie');

// Middleware para verificar que el usuario ha iniciado sesión (sesión válida)
const verifyAuth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || '';
    const [scheme, token] = authorization.split(' ');
    const sessionToken = scheme === 'Bearer' ? token : readCookie(req, SESSION_COOKIE_NAME);
    const session = verifySessionToken(sessionToken);

    if (!session) {
      return res.status(401).json({ error: 'Acceso denegado: se requiere una sesión válida.' });
    }

    const user = await userData.findUserById(session.userId);
    if (!user || !user.isActive || (user.sessionVersion || 0) !== session.sessionVersion) {
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