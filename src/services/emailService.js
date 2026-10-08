const { AppError } = require('../logic/errors');

const sendConfirmationEmail = async (email, token) => {
  const { PUBLIC_URL, RESEND_API_KEY, EMAIL_FROM } = process.env;
  if (!PUBLIC_URL || !RESEND_API_KEY || !EMAIL_FROM) {
    throw new AppError('Falta configurar PUBLIC_URL, RESEND_API_KEY o EMAIL_FROM.', 503);
  }

  const confirmationUrl = new URL('/api/auth/confirm-email', PUBLIC_URL);
  confirmationUrl.searchParams.set('token', token);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [email],
      subject: 'Confirma tu cuenta de Kombina',
      html: `<p>Confirma tu cuenta de Kombina:</p><p><a href="${confirmationUrl.href}">Confirmar cuenta</a></p><p>El enlace caduca en 24 horas.</p>`
    })
  });

  if (!response.ok) {
    throw new AppError('No se pudo enviar el correo de confirmación.', 503);
  }
};

module.exports = { sendConfirmationEmail };