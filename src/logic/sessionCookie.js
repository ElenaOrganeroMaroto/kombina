const SESSION_COOKIE_NAME = 'kombina_session';

const isSecureCookie = () => String(process.env.PUBLIC_URL || '').startsWith('https://');

const appendCookie = (res, name, value, { maxAge, path = '/' }) => {
  const cookieParts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (maxAge !== undefined) cookieParts.push(`Max-Age=${maxAge}`);
  if (isSecureCookie()) cookieParts.push('Secure');
  res.append('Set-Cookie', cookieParts.join('; '));
};

const clearCookie = (res, name, path = '/') => {
  appendCookie(res, name, '', { maxAge: 0, path });
};

const setSessionCookie = (res, token) => {
  appendCookie(res, SESSION_COOKIE_NAME, token, { maxAge: 60 * 60 * 24 * 7 });
};

const clearSessionCookie = (res) => clearCookie(res, SESSION_COOKIE_NAME);

const readCookie = (req, name) => {
  const cookies = String(req.headers.cookie || '').split(';');
  const cookie = cookies.find((item) => item.trim().startsWith(`${name}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.trim().slice(name.length + 1));
  } catch {
    return null;
  }
};

module.exports = {
  SESSION_COOKIE_NAME,
  appendCookie,
  clearCookie,
  setSessionCookie,
  clearSessionCookie,
  readCookie
};