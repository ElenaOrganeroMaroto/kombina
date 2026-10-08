const { OAuth2Client } = require('google-auth-library');

const getGoogleClient = () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PUBLIC_URL } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !PUBLIC_URL) {
    throw new Error('Falta configurar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o PUBLIC_URL.');
  }

  const redirectUri = new URL('/api/auth/google/callback', PUBLIC_URL).href;
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);
};

const createGoogleAuthorizationUrl = (state) => getGoogleClient().generateAuthUrl({
  access_type: 'online',
  prompt: 'select_account',
  scope: ['openid', 'email', 'profile'],
  state
});

const verifyGoogleCode = async (code) => {
  if (!code) throw new Error('Google no devolvió un código de autorización.');

  const client = getGoogleClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) throw new Error('Google no devolvió un token de identidad.');

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const profile = ticket.getPayload();
  if (!profile) throw new Error('No se pudo verificar la identidad de Google.');
  return profile;
};

module.exports = { createGoogleAuthorizationUrl, verifyGoogleCode };