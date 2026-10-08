require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const app = express();

app.use(express.json({ limit: '10mb' })); // las imágenes van en base64

// Servir la carpeta 'public'
app.use(express.static(path.join(__dirname, '../../public')));

// Conexión a MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI;

if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  })
    .then(() => console.log('🟢 Conectado exitosamente a MongoDB Atlas'))
    .catch((err) => console.error('🔴 Error conectando a MongoDB:', err));
}


const userLogic = require('../logic/userLogic');
const { verifyAuth, verifyAdmin } = require('../middleware/authMiddleware');

// Importar rutas de prendas, outfits y colecciones
const clothingApi = require('./clothingApi');
const outfitApi = require('./outfitApi');
const collectionApi = require('./collectionApi');
const calendarApi = require('./calendarApi');

const userData = require('../data/userData');
const profileLogic = require('../logic/profileLogic');
const accountLogic = require('../logic/accountLogic');
const { statusOf } = require('../logic/errors');
const activityLogMiddleware = require('../middleware/activityLogMiddleware');
const { appendCookie, clearCookie, setSessionCookie, clearSessionCookie, readCookie } = require('../logic/sessionCookie');
const { createOAuthState, verifyOAuthState } = require('../logic/oauthState');
const { createGoogleAuthorizationUrl, verifyGoogleCode } = require('../services/googleOAuthService');

app.use(activityLogMiddleware);
app.use(clothingApi);
app.use(outfitApi);
app.use(collectionApi);
app.use(calendarApi);

// Perfil del usuario (nombre, usuario, bio, avatar)
app.get('/api/profile', async (req, res) => {
  try {
    res.json(await profileLogic.getProfile(req.query.userId));
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

app.put('/api/profile', async (req, res) => {
  try {
    res.json(await profileLogic.updateProfile(req.body.userId, req.body));
  } catch (error) {
    res.status(statusOf(error, 400)).json({ error: error.message });
  }
});

// Ruta de registro
app.post('/api/register', async (req, res) => {
  try {
    // Solo se aceptan email y contraseña: el rol y el estado nunca los decide el navegador
    const { email, password } = req.body;
    const newUser = await userLogic.registerUser({ email, password });
    req.activityActorId = newUser._id;
    req.activityActorRole = newUser.role;
    res.status(201).json({
      message: 'Registro completado. Revisa tu correo para confirmar la cuenta.',
      user: userLogic.toPublicUser(newUser)
    });
  } catch (error) {
    res.status(statusOf(error, 400)).json({ error: error.message });
  }
});

app.get('/api/auth/confirm-email', async (req, res) => {
  try {
    const user = await userLogic.confirmEmail(req.query.token);
    req.activityActorId = user._id;
    req.activityActorRole = user.role;
    res.redirect(303, '/login.html?confirmed=1');
  } catch (error) {
    res.status(statusOf(error, 400)).json({ error: error.message });
  }
});

app.post('/api/resend-confirmation', async (req, res) => {
  try {
    res.json(await userLogic.resendConfirmation(req.body.email));
  } catch (error) {
    res.status(statusOf(error, 503)).json({ error: error.message });
  }
});

// Ruta de login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await userLogic.loginUser(email, password);
    req.activityActorId = result.user._id;
    req.activityActorRole = result.user.role;
    setSessionCookie(res, result.token);
    res.json({
      message: result.message,
      user: userLogic.toPublicUser(result.user)
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.get('/api/auth/google', (req, res) => {
  try {
    const { state, cookieValue } = createOAuthState();
    appendCookie(res, 'kombina_oauth_state', cookieValue, {
      maxAge: 600,
      path: '/api/auth/google/callback'
    });
    res.redirect(createGoogleAuthorizationUrl(state));
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.get('/api/auth/google/callback', async (req, res) => {
  const stateCookie = readCookie(req, 'kombina_oauth_state');
  clearCookie(res, 'kombina_oauth_state', '/api/auth/google/callback');
  if (!verifyOAuthState(stateCookie, req.query.state)) {
    req.activityFailure = true;
    return res.redirect(303, '/login.html?oauth=invalid');
  }

  try {
    const googleProfile = await verifyGoogleCode(req.query.code);
    const result = await userLogic.loginWithGoogle(googleProfile);
    req.activityActorId = result.user._id;
    req.activityActorRole = result.user.role;
    setSessionCookie(res, result.token);
    res.redirect(303, '/login.html?oauth=success');
  } catch {
    req.activityFailure = true;
    res.redirect(303, '/login.html?oauth=failed');
  }
});

app.get('/api/session', verifyAuth, (req, res) => {
  res.json({ user: userLogic.toPublicUser(req.user) });
});

app.post('/api/logout', verifyAuth, async (req, res) => {
  try {
    await userData.incrementSessionVersion(req.user._id);
    clearSessionCookie(res);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'No se pudo cerrar la sesión en el servidor.' });
  }
});

// Ruta protegida: Eliminar cuenta
app.delete('/api/account', verifyAuth, async (req, res) => {
  try {
    const { email } = req.body;
    const target = await userData.findUserByEmail(email);
    req.activityTargetId = target && target._id;
    const deleted = await userLogic.removeAccount(email, req.user.role, req.user.email);

    // Borrar también todos los datos del usuario en la base de datos
    if (target) await accountLogic.removeUserData(target._id);
    clearSessionCookie(res);
    res.json({ message: 'Cuenta eliminada con éxito', deleted: userLogic.toPublicUser(deleted) });
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});

app.get('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    res.json(await userLogic.listUsers());
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

app.get('/api/admin/users/:userId/status', verifyAdmin, async (req, res) => {
  try {
    res.json(await userLogic.getUserStatus(req.params.userId));
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

app.get('/api/admin/check', verifyAdmin, (req, res) => {
  res.json({ message: 'Acceso de administrador autorizado correctamente.' });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

module.exports = app;