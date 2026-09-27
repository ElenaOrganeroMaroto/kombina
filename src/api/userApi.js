const express = require('express');
const path = require('path'); // 1. Importante para manejar rutas de carpetas
const app = express();

app.use(express.json());

// 2. Servir la carpeta 'public' (subiendo dos niveles desde src/api hasta la raíz)
app.use(express.static(path.join(__dirname, '../../public')));

/* Comentamos esto para que no intercepte la ruta raíz '/' y cargue el index.html
app.get('/', (req, res) => {
  res.json({ message: '¡API de Kombina funcionando correctamente!' });
});
*/

const userLogic = require('../logic/userLogic');
// Ojo: mantengo 'middlerware' tal cual lo tienes en tu carpeta o cámbialo si lo renombraste
const { verifyAuth, verifyAdmin } = require('../middleware/authMiddleware');

// Ruta de registro (asíncrona por bcrypt)
app.post('/api/register', async (req, res) => {
  try {
    const newUser = await userLogic.registerUser(req.body);
    res.status(201).json({ message: 'Usuario registrado con éxito', user: newUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Ruta de login (asíncrona por bcrypt)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await userLogic.loginUser(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Ruta protegida: Eliminar cuenta (requiere autenticación)
app.delete('/api/account', verifyAuth, (req, res) => {
  try {
    const { email } = req.body;
    const deleted = userLogic.removeAccount(email, req.user.role, req.user.email);
    res.json({ message: 'Cuenta eliminada con éxito', deleted });
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});

// Ruta protegida de administrador
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