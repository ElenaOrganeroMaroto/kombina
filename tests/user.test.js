const mongoose = require('mongoose');
const request = require('supertest');
jest.mock('../src/services/emailService', () => ({
  sendConfirmationEmail: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../src/services/googleOAuthService', () => ({
  createGoogleAuthorizationUrl: jest.fn((state) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`),
  verifyGoogleCode: jest.fn()
}));
const userLogic = require('../src/logic/userLogic');
const userData = require('../src/data/userData');
const User = require('../src/models/User');
const app = require('../src/api/userApi');
const { sendConfirmationEmail } = require('../src/services/emailService');
const googleOAuthService = require('../src/services/googleOAuthService');

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
  sendConfirmationEmail.mockClear();
  googleOAuthService.verifyGoogleCode.mockReset();
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

test('registra actividad con resultado y actor sin guardar credenciales', async () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const email = 'audit@uclm.es';
  const password = 'Secret-password-123';

  try {
    const registration = await request(app)
      .post('/api/register')
      .send({ email, password });
    expect(registration.status).toBe(201);

    await request(app)
      .post('/api/login')
      .send({ email, password });

    const user = await User.findOne({ email });
    user.isActive = true;
    await user.save();
    const login = await request(app)
      .post('/api/login')
      .send({ email, password });
    const sessionCookie = login.headers['set-cookie']
      .find((cookie) => cookie.startsWith('kombina_session='))
      .split(';')[0];
    await request(app)
      .delete('/api/account')
      .set('Cookie', sessionCookie)
      .send({ email });

    const records = logSpy.mock.calls.map(([record]) => JSON.parse(record));
    const registrationLog = records.find((record) => record.action === 'POST /api/register');
    const loginLog = records.find((record) => record.action === 'POST /api/login');
    const deletionLog = records.find((record) => record.action === 'DELETE /api/account');

    expect(registrationLog).toMatchObject({
      event: 'activity',
      outcome: 'success',
      statusCode: 201,
      actorRole: 'user'
    });
    expect(registrationLog.actorId).toBeDefined();
    expect(loginLog).toMatchObject({
      event: 'activity',
      outcome: 'failure',
      statusCode: 401
    });
    expect(deletionLog).toMatchObject({
      outcome: 'success',
      statusCode: 200,
      actorRole: 'user',
      targetId: registration.body.user._id
    });
    expect(JSON.stringify(records)).not.toContain(password);
    expect(JSON.stringify(records)).not.toContain(email);
  } finally {
    logSpy.mockRestore();
  }
});

test('un GET del enlace no consume el token; el POST confirma el correo y redirige al login', async () => {
  await userLogic.registerUser({ email: 'http-confirm@uclm.es', password: '123' });
  const token = sendConfirmationEmail.mock.calls[0][1];

  const linkPreview = await request(app)
    .get('/api/auth/confirm-email')
    .query({ token });
  expect(linkPreview.status).toBe(200);
  expect(linkPreview.text).toContain('Confirmar cuenta');
  await expect(userLogic.loginUser('http-confirm@uclm.es', '123'))
    .rejects.toThrow('La cuenta está pendiente de confirmación por correo.');

  const response = await request(app)
    .post('/api/auth/confirm-email')
    .type('form')
    .send({ token });

  expect(response.status).toBe(303);
  expect(response.headers.location).toBe('/login.html?confirmed=1');
  await expect(userLogic.loginUser('http-confirm@uclm.es', '123')).resolves.toMatchObject({
    user: { isActive: true }
  });
});

test('el callback OAuth valida state y crea una sesión Google persistente', async () => {
  googleOAuthService.verifyGoogleCode.mockResolvedValue({
    sub: 'google-user-123',
    email: 'google@uclm.es',
    email_verified: true,
    name: 'Google User'
  });

  const start = await request(app).get('/api/auth/google');
  expect(start.status).toBe(302);
  const authorizationUrl = new URL(start.headers.location);
  const state = authorizationUrl.searchParams.get('state');
  const stateCookie = start.headers['set-cookie']
    .find((cookie) => cookie.startsWith('kombina_oauth_state='))
    .split(';')[0];

  const callback = await request(app)
    .get('/api/auth/google/callback')
    .query({ code: 'authorization-code', state })
    .set('Cookie', stateCookie);

  expect(callback.status).toBe(303);
  expect(callback.headers.location).toBe('/login.html?oauth=success');
  expect(googleOAuthService.verifyGoogleCode).toHaveBeenCalledWith('authorization-code');

  const sessionCookie = callback.headers['set-cookie']
    .find((cookie) => cookie.startsWith('kombina_session='))
    .split(';')[0];
  const session = await request(app)
    .get('/api/session')
    .set('Cookie', sessionCookie);

  expect(session.status).toBe(200);
  expect(session.body.user).toMatchObject({ email: 'google@uclm.es', role: 'user', isActive: true });
});

test('el callback OAuth rechaza state inválido y registra el fallo', async () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    const response = await request(app)
      .get('/api/auth/google/callback')
      .query({ code: 'authorization-code', state: 'forged-state' });

    expect(response.status).toBe(303);
    expect(response.headers.location).toBe('/login.html?oauth=invalid');
    expect(googleOAuthService.verifyGoogleCode).not.toHaveBeenCalled();
    expect(JSON.parse(logSpy.mock.calls[0][0])).toMatchObject({
      action: 'GET /api/auth/google/callback',
      outcome: 'failure',
      statusCode: 303
    });
  } finally {
    logSpy.mockRestore();
  }
});

test('logout invalida en el servidor una sesión incluso si se conserva el token', async () => {
  await createActiveUser('logout@uclm.es');
  const login = await request(app)
    .post('/api/login')
    .send({ email: 'logout@uclm.es', password: 'password123' });
  expect(login.body).not.toHaveProperty('token');
  const sessionCookie = login.headers['set-cookie']
    .find((cookie) => cookie.startsWith('kombina_session='))
    .split(';')[0];
  expect(login.headers['set-cookie'].find((cookie) => cookie.startsWith('kombina_session=')))
    .toMatch(/HttpOnly/i);

  const beforeLogout = await request(app)
    .get('/api/session')
    .set('Cookie', sessionCookie);
  expect(beforeLogout.status).toBe(200);

  const logout = await request(app)
    .post('/api/logout')
    .set('Cookie', sessionCookie);
  expect(logout.status).toBe(204);

  const afterLogout = await request(app)
    .get('/api/session')
    .set('Cookie', sessionCookie);
  expect(afterLogout.status).toBe(401);
});

test('confirma una cuenta con un token válido de un solo uso', async () => {
  const user = await userLogic.registerUser({ email: 'confirm@uclm.es', password: '123' });
  const confirmationToken = sendConfirmationEmail.mock.calls[0][1];

  expect(user.isActive).toBe(false);
  const confirmedUser = await userLogic.confirmEmail(confirmationToken);

  expect(confirmedUser.isActive).toBe(true);
  await expect(userLogic.confirmEmail(confirmationToken))
    .rejects.toThrow('El enlace de confirmación no es válido o ha caducado.');
  await expect(userLogic.loginUser('confirm@uclm.es', '123')).resolves.toMatchObject({
    user: { isActive: true }
  });
});