const { AppError } = require('../logic/errors');

const sendConfirmationEmail = async (email, token) => {
  const { PUBLIC_URL, BREVO_API_KEY, EMAIL_FROM } = process.env;
  if (!PUBLIC_URL || !BREVO_API_KEY || !EMAIL_FROM) {
    throw new AppError('Falta configurar PUBLIC_URL, BREVO_API_KEY o EMAIL_FROM.', 503);
  }

  const confirmationUrl = new URL('/api/auth/confirm-email', PUBLIC_URL);
  confirmationUrl.searchParams.set('token', token);

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Kombina', email: EMAIL_FROM },
      to: [{ email }],
      subject: 'Confirma tu cuenta de Kombina',
      htmlContent: `<p>Confirma tu cuenta de Kombina:</p><p><a href="${confirmationUrl.href}">Confirmar cuenta</a></p><p>El enlace caduca en 24 horas.</p>`
    })
  });

  if (!response.ok) {
    // Solo al log del servidor: ayuda a depurar sin exponer detalles al usuario
    console.error('Brevo error', response.status, await response.text());
    throw new AppError('No se pudo enviar el correo de confirmación.', 503);
  }
};

module.exports = { sendConfirmationEmail };