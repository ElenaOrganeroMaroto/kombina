const mongoose = require('mongoose');
const userLogic = require('../src/logic/userLogic');
const userData = require('../src/data/userData');

// Conectar a la base de datos antes de ejecutar los tests
beforeAll(async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kombina_test';

  // Seguridad: estos tests borran TODOS los usuarios (clearUsers), así que solo se ejecutan
  // contra una base de datos cuyo nombre contenga "test" (nunca contra la base real de la app).
  if (!/test/i.test(MONGODB_URI)) {
    throw new Error('MONGODB_URI debe apuntar a una base de datos de pruebas (con "test" en el nombre).');
  }

  if (mongoose.connection.readyState === 0) {
    // Falla pronto y con un mensaje claro si no hay base de datos disponible
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  }
}, 20000);

// Limpiar la base de datos antes de cada test
beforeEach(async () => {
  if (typeof userData.clearUsers === 'function') {
    await userData.clearUsers();
  }
});

// Cerrar la conexión de Mongoose al terminar todos los tests
afterAll(async () => {
  await mongoose.disconnect();
});

test('1. Registro exitoso de un nuevo usuario', async () => {
  const newUser = await userLogic.registerUser({ email: 'test@uclm.es', password: '123' });
  expect(newUser.email).toBe('test@uclm.es');
  expect(newUser.isActive).toBe(false);
});

test('2. Intento de registro con correo duplicado (Caso de error)', async () => {
  await userLogic.registerUser({ email: 'test@uclm.es', password: '123' });
  await expect(
    userLogic.registerUser({ email: 'test@uclm.es', password: '456' })
  ).rejects.toThrow('El correo electrónico ya está registrado.');
});

test('3. Inicio de sesión con cuenta pendiente de confirmar (Caso de error)', async () => {
  await userLogic.registerUser({ email: 'test@uclm.es', password: '123', isActive: false });
  await expect(
    userLogic.loginUser('test@uclm.es', '123')
  ).rejects.toThrow('La cuenta está pendiente de confirmación por correo.');
});

test('4. Intento de usuario normal ejecutando acción de administrador (Caso de error)', () => {
  expect(() => {
    userLogic.adminActionCheck('user');
  }).toThrow('Acceso denegado: se requieren permisos de administrador.');
});

test('5. Eliminación correcta de cuenta propia', async () => {
  await userLogic.registerUser({ email: 'test@uclm.es', password: '123', isActive: true });
  const deleted = await userLogic.removeAccount('test@uclm.es', 'user', 'test@uclm.es');
  expect(deleted.email).toBe('test@uclm.es');
  
  const users = await userData.getUsers();
  expect(users.length).toBe(0);
});