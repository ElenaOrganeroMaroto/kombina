// Error con código HTTP asociado. La capa lógica lo lanza y la capa API lo traduce a una respuesta.
class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

// Código HTTP que corresponde a un error (por defecto, el que indique la ruta)
const statusOf = (error, fallback = 500) => {
  if (error instanceof AppError) return error.status;
  if (error && (error.name === 'CastError' || error.name === 'ValidationError')) return 400;
  return fallback;
};

module.exports = { AppError, statusOf };