const mongoose = require('mongoose');
const request = require('supertest');
const userLogic = require('../src/logic/userLogic');
const userData = require('../src/data/userData');
const User = require('../src/models/User');
const app = require('../src/api/userApi');

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
    // runtimeAdapters: el driver de MongoDB 7.x carga 'os' con import() dinámico, que Jest no soporta
    // por defecto; sin esto envía un saludo vacío y el servidor rechaza la conexión.
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      runtimeAdapters: { os: require('os') }
    });
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

const createActiveUser = async (email, role = 'user') => {
  const user = await userLogic.registerUser({ email, password: 'password123' });
  user.isActive = true;
  user.role = role;
  await user.save();
  return user;
};

test('el registro ignora intentos de asignarse rol admin o estado activo', async () => {
  const user = await userLogic.registerUser({
    email: 'normal@uclm.es',
    password: '123',
    role: 'admin',
    isActive: true
  });

  expect(user.role).toBe('user');
  expect(user.isActive).toBe(false);
});

test('solo un administrador puede listar usuarios y la respuesta no incluye contraseñas', async () => {
  const admin = await createActiveUser('admin@uclm.es', 'admin');
  await createActiveUser('user@uclm.es');
  const regularLogin = await userLogic.loginUser('user@uclm.es', 'password123');
  const adminLogin = await userLogic.loginUser('admin@uclm.es', 'password123');

  const spoofedRequest = await request(app)
    .get('/api/admin/users')
    .set('x-user-email', admin.email);
  expect(spoofedRequest.status).toBe(401);

  const deniedRequest = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${regularLogin.token}`);
  expect(deniedRequest.status).toBe(403);

  const response = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${adminLogin.token}`);
  expect(response.status).toBe(200);
  expect(response.body).toEqual(expect.arrayContaining([
    expect.objectContaining({ email: 'user@uclm.es', role: 'user', isActive: true })
  ]));
  expect(response.body[0]).not.toHaveProperty('password');
});

test('solo un administrador puede consultar el estado activo', async () => {
  const admin = await createActiveUser('admin@uclm.es', 'admin');
  const target = await createActiveUser('target@uclm.es');
  const regularLogin = await userLogic.loginUser('target@uclm.es', 'password123');
  const adminLogin = await userLogic.loginUser('admin@uclm.es', 'password123');

  const deniedRequest = await request(app)
    .get(`/api/admin/users/${target._id}/status`)
    .set('Authorization', `Bearer ${regularLogin.token}`);
  expect(deniedRequest.status).toBe(403);

  const response = await request(app)
    .get(`/api/admin/users/${target._id}/status`)
    .set('Authorization', `Bearer ${adminLogin.token}`);
  expect(response.status).toBe(200);
  expect(response.body.isActive).toBe(true);
});

test('un usuario no puede borrar a otro, pero sí su cuenta y luego no puede iniciar sesión', async () => {
  const owner = await createActiveUser('owner@uclm.es');
  await createActiveUser('other@uclm.es');
  const ownerLogin = await userLogic.loginUser('owner@uclm.es', 'password123');

  const deniedRequest = await request(app)
    .delete('/api/account')
    .set('Authorization', `Bearer ${ownerLogin.token}`)
    .send({ email: 'other@uclm.es' });
  expect(deniedRequest.status).toBe(403);

  const ownDelete = await request(app)
    .delete('/api/account')
    .set('Authorization', `Bearer ${ownerLogin.token}`)
    .send({ email: owner.email });
  expect(ownDelete.status).toBe(200);
  await expect(userLogic.loginUser('owner@uclm.es', 'password123'))
    .rejects.toThrow('Usuario no encontrado.');
});

test('un administrador puede eliminar a otro usuario', async () => {
  await createActiveUser('admin@uclm.es', 'admin');
  await createActiveUser('target@uclm.es');
  const adminLogin = await userLogic.loginUser('admin@uclm.es', 'password123');

  const response = await request(app)
    .delete('/api/account')
    .set('Authorization', `Bearer ${adminLogin.token}`)
    .send({ email: 'target@uclm.es' });

  expect(response.status).toBe(200);
  await expect(userLogic.loginUser('target@uclm.es', 'password123'))
    .rejects.toThrow('Usuario no encontrado.');
});