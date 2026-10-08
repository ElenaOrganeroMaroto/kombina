const crypto = require('crypto');

const stateSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const createOAuthState = () => {
  const state = crypto.randomBytes(32).toString('hex');
  const signature = crypto.createHmac('sha256', stateSecret).update(state).digest('hex');
  return { state, cookieValue: `${state}.${signature}` };
};

const verifyOAuthState = (cookieValue, returnedState) => {
  if (typeof cookieValue !== 'string' || typeof returnedState !== 'string') return false;
  const [state, signature, extra] = cookieValue.split('.');
  if (!state || !signature || extra !== undefined || state !== returnedState) return false;

  const expected = crypto.createHmac('sha256', stateSecret).update(state).digest();
  const supplied = Buffer.from(signature, 'hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
};

module.exports = { createOAuthState, verifyOAuthState };