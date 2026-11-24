const { AppError } = require('./errors');

const normalizeAndValidateEmail = (email) => {
  if (typeof email !== 'string') {
    throw new AppError('EMAIL_INVALIDO');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const atIndex = normalizedEmail.indexOf('@');

  if (
    atIndex <= 0
    || atIndex !== normalizedEmail.lastIndexOf('@')
    || /\s/.test(normalizedEmail)
  ) {
    throw new AppError('EMAIL_INVALIDO');
  }

  const domain = normalizedEmail.slice(atIndex + 1);
  if (
    domain.length === 0
    || !domain.includes('.')
    || domain.startsWith('.')
    || domain.endsWith('.')
  ) {
    throw new AppError('EMAIL_INVALIDO');
  }

  return normalizedEmail;
};

module.exports = { normalizeAndValidateEmail };
