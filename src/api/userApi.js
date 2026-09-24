const express = require('express');
const app = express();
app.use(express.json());

const userLogic = require('../logic/userLogic');

// Ruta de registro
app.post('/api/register', (req, res) => {
  try {
    const newUser = userLogic.registerUser(req.body);
    res.status(201).json({ message: 'Usuario registrado con éxito', user: newUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Ruta de login
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const result = userLogic.loginUser(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

module.exports = app;