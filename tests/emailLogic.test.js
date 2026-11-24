const { normalizeAndValidateEmail } = require('../src/logic/emailLogic');
const request = require('supertest');
const app = require('../src/api/userApi');

test('variante2: normaliza los espacios y las mayusculas de un email valido', () => {
  expect(normalizeAndValidateEmail(' Ana@X.com ')).toBe('ana@x.com');
});

test('variante2: rechaza un email con formato invalido', () => {
  expect(() => normalizeAndValidateEmail('ana@x'))
    .toThrow('EMAIL_INVALIDO');
});

test('variante2: rechaza valores ausentes o que no sean texto', () => {
  expect(() => normalizeAndValidateEmail(undefined)).toThrow('EMAIL_INVALIDO');
  expect(() => normalizeAndValidateEmail(42)).toThrow('EMAIL_INVALIDO');
});

test('variante2: el endpoint devuelve el correo normalizado', async () => {
  const response = await request(app)
    .post('/api/prueba/email')
    .send({ email: ' Ana@X.com ' });

  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toMatch(/application\/json/);
  expect(response.body).toEqual({ email: 'ana@x.com' });
});

test('variante2: el endpoint rechaza un email ausente o de tipo incorrecto', async () => {
  const missingEmail = await request(app)
    .post('/api/prueba/email')
    .send({});
  const invalidType = await request(app)
    .post('/api/prueba/email')
    .send({ email: 123 });

  expect(missingEmail.status).toBe(400);
  expect(missingEmail.body).toEqual({ error: 'EMAIL_INVALIDO' });
  expect(invalidType.status).toBe(400);
  expect(invalidType.body).toEqual({ error: 'EMAIL_INVALIDO' });
});
