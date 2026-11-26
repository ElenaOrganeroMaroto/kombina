const mongoose = require('mongoose');
const request = require('supertest');
jest.mock('../src/services/emailService', () => ({
  sendConfirmationEmail: jest.fn().mockResolvedValue(undefined)
}));
const { computeStats, isValidDateKey } = require('../src/logic/statsLogic');
const { createSessionToken } = require('../src/logic/sessionToken');
const User = require('../src/models/User');
const Clothing = require('../src/models/Clothing');
const Outfit = require('../src/models/Outfit');
const CalendarEntry = require('../src/models/CalendarEntry');
const app = require('../src/api/userApi');

// --- Pruebas unitarias de computeStats (sin base de datos) ---

const shirt = { _id: 'c1', name: 'Camiseta blanca', category: 'Tops', image: 'img1' };
const jeans = { _id: 'c2', name: 'Vaqueros', category: 'Pantalones', image: 'img2' };
const coat = { _id: 'c3', name: 'Abrigo largo', category: 'Abrigo', image: 'img3' };
const top2 = { _id: 'c4', name: 'Blusa', category: 'Tops', image: 'img4' };

describe('computeStats', () => {
  test('con el armario vacío devuelve todo a cero y listas vacías', () => {
    const stats = computeStats({ today: '2026-11-26' });
    expect(stats.totals).toEqual({ clothing: 0, outfits: 0, plannedDays: 0 });
    expect(stats.byCategory).toEqual([]);
    expect(stats.usage).toEqual({ usedClothing: 0, usageRate: 0 });
    expect(stats.topClothing).toEqual([]);
    expect(stats.unusedClothing).toEqual({ count: 0, items: [] });
    expect(stats.topOutfits).toEqual([]);
    expect(stats.month).toEqual({ month: '2026-11', totalDays: 30, plannedDays: 0, coverage: 0 });
    expect(stats.nextPlannedDate).toBeNull();
  });

  test('agrupa por categoría con porcentajes y ordena de mayor a menor', () => {
    const stats = computeStats({ clothing: [shirt, jeans, top2, { _id: 'c9', name: 'Sin cat' }], today: '2026-11-26' });
    expect(stats.byCategory).toEqual([
      { category: 'Tops', count: 2, percent: 50 },
      { category: 'Pantalones', count: 1, percent: 25 },
      { category: 'Sin categoría', count: 1, percent: 25 }
    ]);
  });

  test('cuenta en cuántos outfits distintos aparece cada prenda y detecta las olvidadas', () => {
    const outfits = [
      { _id: 'o1', name: 'Casual', items: [shirt, jeans] },
      { _id: 'o2', name: 'Oficina', items: [shirt, jeans, shirt] }, // prenda repetida: cuenta una vez
      { _id: 'o3', name: 'Fresco', items: [shirt] }
    ];
    const stats = computeStats({ clothing: [shirt, jeans, coat], outfits, today: '2026-11-26' });

    expect(stats.topClothing.map(c => [c.id, c.uses])).toEqual([['c1', 3], ['c2', 2]]);
    expect(stats.topClothing[0]).toEqual({ id: 'c1', name: 'Camiseta blanca', category: 'Tops', image: 'img1', uses: 3 });
    expect(stats.unusedClothing.count).toBe(1);
    expect(stats.unusedClothing.items[0].id).toBe('c3');
    expect(stats.usage).toEqual({ usedClothing: 2, usageRate: 67 });
  });

  test('ignora prendas de outfits que ya no existen en el armario', () => {
    const outfits = [{ _id: 'o1', name: 'Viejo', items: [{ _id: 'borrada', name: 'Prenda borrada' }, jeans] }];
    const stats = computeStats({ clothing: [jeans], outfits, today: '2026-11-26' });
    expect(stats.topClothing).toHaveLength(1);
    expect(stats.topClothing[0].id).toBe('c2');
    expect(stats.usage.usageRate).toBe(100);
  });

  test('en caso de empate ordena por nombre y limita los rankings a 5', () => {
    const clothing = ['F', 'E', 'D', 'C', 'B', 'A'].map(n => ({ _id: `id${n}`, name: n, category: 'Tops' }));
    const outfits = [{ _id: 'o1', name: 'Todo', items: clothing }];
    const stats = computeStats({ clothing, outfits, today: '2026-11-26' });
    expect(stats.topClothing.map(c => c.name)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  test('limita las prendas olvidadas devueltas pero informa del total', () => {
    const clothing = Array.from({ length: 8 }, (_, i) => ({ _id: `u${i}`, name: `Prenda ${i}`, category: 'Tops' }));
    const stats = computeStats({ clothing, today: '2026-11-26' });
    expect(stats.unusedClothing.count).toBe(8);
    expect(stats.unusedClothing.items).toHaveLength(6);
  });

  test('calcula el calendario ignorando outfits borrados, días vacíos y fechas inválidas', () => {
    const outfits = [{ _id: 'o1', name: 'Casual', items: [] }, { _id: 'o2', name: 'Oficina', items: [] }];
    const calendar = [
      { date: '2026-11-02', outfitIds: ['o1', 'o2'] },
      { date: '2026-11-03', outfitIds: ['o1', 'o1'] },     // repetido: cuenta un día
      { date: '2026-11-04', outfitIds: ['borrado'] },     // solo outfits borrados: no cuenta
      { date: '2026-11-05', outfitIds: [] },
      { date: '2026-02-30', outfitIds: ['o1'] },          // fecha imposible: no cuenta
      { date: '2026-12-01', outfitIds: ['o2'] },
      { date: '2026-10-31', outfitIds: ['o1'] }
    ];
    const stats = computeStats({ outfits, calendar, today: '2026-11-26' });

    expect(stats.totals.plannedDays).toBe(4);
    expect(stats.topOutfits).toEqual([
      { id: 'o1', name: 'Casual', days: 3 },
      { id: 'o2', name: 'Oficina', days: 2 }
    ]);
    expect(stats.month).toEqual({ month: '2026-11', totalDays: 30, plannedDays: 2, coverage: 7 });
    expect(stats.nextPlannedDate).toBe('2026-12-01');
  });

  test('el próximo día planificado incluye el propio día de hoy', () => {
    const outfits = [{ _id: 'o1', name: 'Hoy', items: [] }];
    const calendar = [{ date: '2026-11-26', outfitIds: ['o1'] }, { date: '2026-11-20', outfitIds: ['o1'] }];
    expect(computeStats({ outfits, calendar, today: '2026-11-26' }).nextPlannedDate).toBe('2026-11-26');
  });

  test('tiene en cuenta los años bisiestos al calcular los días del mes', () => {
    expect(computeStats({ today: '2028-02-10' }).month.totalDays).toBe(29);
    expect(computeStats({ today: '2026-02-10' }).month.totalDays).toBe(28);
  });

  test('isValidDateKey solo acepta fechas reales con formato AAAA-MM-DD', () => {
    expect(isValidDateKey('2026-11-26')).toBe(true);
    expect(isValidDateKey('2028-02-29')).toBe(true);
    expect(isValidDateKey('2026-02-29')).toBe(false);
    expect(isValidDateKey('2026-13-01')).toBe(false);
    expect(isValidDateKey('26-11-2026')).toBe(false);
    expect(isValidDateKey(undefined)).toBe(false);
  });
});

// --- Pruebas de integración del endpoint GET /api/stats ---

// Base de datos propia para este fichero, así no interfiere con user.test.js (que borra todos los usuarios
// y Jest ejecuta los ficheros en paralelo).
const BASE_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kombina_test';
const STATS_URI = BASE_URI.replace(/\/([^/?]+)(\?|$)/, '/$1_stats$2');

const createActiveUser = (email) => new User({ email, password: 'x', isActive: true }).save();
const bearer = (user) => `Bearer ${createSessionToken(user._id, user.sessionVersion || 0)}`;

describe('GET /api/stats', () => {
  beforeAll(async () => {
    if (!/test/i.test(STATS_URI)) {
      throw new Error('MONGODB_URI debe apuntar a una base de datos de pruebas (con "test" en el nombre).');
    }
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(STATS_URI, {
        serverSelectionTimeoutMS: 10000,
        runtimeAdapters: { os: require('os') }
      });
    }
  }, 20000);

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Clothing.deleteMany({}), Outfit.deleteMany({}), CalendarEntry.deleteMany({})]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('sin sesión devuelve 401', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(401);
  });

  test('rechaza una fecha "today" no válida con 400', async () => {
    const user = await createActiveUser('fecha@uclm.es');
    const res = await request(app).get('/api/stats?today=2026-02-30').set('Authorization', bearer(user));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Fecha no válida');
  });

  test('devuelve las estadísticas del usuario de la sesión y nunca las de otro', async () => {
    const ana = await createActiveUser('ana@uclm.es');
    const otro = await createActiveUser('otro@uclm.es');

    const [camiseta, vaqueros, abrigo] = await Clothing.insertMany([
      { name: 'Camiseta', category: 'Tops', image: 'a', userId: ana._id },
      { name: 'Vaqueros', category: 'Pantalones', image: 'b', userId: ana._id },
      { name: 'Abrigo', category: 'Abrigo', image: 'c', userId: ana._id }
    ]);
    // Las prendas se copian dentro del outfit tal como las guarda el frontend
    const outfit = await new Outfit({
      name: 'Diario',
      items: [camiseta.toObject(), vaqueros.toObject()],
      userId: ana._id
    }).save();
    await CalendarEntry.create({ userId: ana._id, date: '2026-11-10', outfitIds: [String(outfit._id)] });

    // Datos de otro usuario que no deben aparecer
    await Clothing.create({ name: 'Ajena', category: 'Tops', image: 'z', userId: otro._id });

    const res = await request(app)
      .get(`/api/stats?today=2026-11-26&userId=${otro._id}`) // el userId de la query se ignora
      .set('Authorization', bearer(ana));

    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({ clothing: 3, outfits: 1, plannedDays: 1 });
    expect(res.body.usage).toEqual({ usedClothing: 2, usageRate: 67 });
    expect(res.body.unusedClothing.count).toBe(1);
    expect(res.body.unusedClothing.items[0].id).toBe(String(abrigo._id));
    expect(res.body.topOutfits).toEqual([{ id: String(outfit._id), name: 'Diario', days: 1 }]);
    expect(res.body.month).toEqual({ month: '2026-11', totalDays: 30, plannedDays: 1, coverage: 3 });
    expect(res.body.nextPlannedDate).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain('Ajena');

    const otherRes = await request(app).get('/api/stats?today=2026-11-26').set('Authorization', bearer(otro));
    expect(otherRes.body.totals).toEqual({ clothing: 1, outfits: 0, plannedDays: 0 });
  });

  test('una sesión revocada (logout) ya no puede consultar las estadísticas', async () => {
    const user = await createActiveUser('revocada@uclm.es');
    const token = bearer(user);
    await User.updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
    const res = await request(app).get('/api/stats').set('Authorization', token);
    expect(res.status).toBe(401);
  });
});
