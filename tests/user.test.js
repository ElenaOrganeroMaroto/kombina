const userLogic = require('../src/logic/userLogic');
const userData = require('../src/data/userData');

beforeEach(() => {
  userData.clearUsers();
});

test('1. Registro exitoso de un nuevo usuario', () => {
  const newUser = userLogic.registerUser({ email: 'test@uclm.es', password: '123' });
  expect(newUser.email).toBe('test@uclm.es');
  expect(newUser.isActive).toBe(false);
});

test('2. Intento de registro con correo duplicado (Caso de error)', () => {
  userLogic.registerUser({ email: 'test@uclm.es', password: '123' });
  expect(() => {
    userLogic.registerUser({ email: 'test@uclm.es', password: '456' });
  }).toThrow('El correo electrónico ya está registrado.');
});

test('3. Inicio de sesión con cuenta pendiente de confirmar (Caso de error)', () => {
  userLogic.registerUser({ email: 'test@uclm.es', password: '123', isActive: false });
  expect(() => {
    userLogic.loginUser('test@uclm.es', '123');
  }).toThrow('La cuenta está pendiente de confirmación por correo.');
});

test('4. Intento de usuario normal ejecutando acción de administrador (Caso de error)', () => {
  expect(() => {
    userLogic.adminActionCheck('user');
  }).toThrow('Acceso denegado: se requieren permisos de administrador.');
});

test('5. Eliminación correcta de cuenta propia', () => {
  userLogic.registerUser({ email: 'test@uclm.es', password: '123', isActive: true });
  const deleted = userLogic.removeAccount('test@uclm.es', 'user', 'test@uclm.es');
  expect(deleted.email).toBe('test@uclm.es');
  expect(userData.getUsers().length).toBe(0);
});