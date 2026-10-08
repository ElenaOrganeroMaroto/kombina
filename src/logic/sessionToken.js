const crypto = require('crypto');

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const createSessionToken = (userId, sessionVersion = 0) => {
  const payload = Buffer.from(JSON.stringify({
    sub: String(userId),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    ver: sessionVersion
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const verifySessionToken = (token) => {
  if (typeof token !== 'string') return null;

  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;

  const expectedSignature = crypto.createHmac('sha256', sessionSecret).update(payload).digest();
  let suppliedSignature;
  try {
    suppliedSignature = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (suppliedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(suppliedSignature, expectedSignature)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof claims.sub !== 'string' || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    const sessionVersion = Number.isInteger(claims.ver) ? claims.ver : 0;
    return { userId: claims.sub, sessionVersion };
  } catch {
    return null;
  }
};

module.exports = { createSessionToken, verifySessionToken };