const express = require('express');
const router = express.Router();
const statsLogic = require('../logic/statsLogic');
const { statusOf } = require('../logic/errors');
const { verifyAuth } = require('../middleware/authMiddleware');

// Estadísticas del armario del usuario con sesión iniciada.
// El usuario sale siempre de la sesión (nunca de la query), así nadie puede ver las de otra persona.
// ?today=AAAA-MM-DD (opcional) indica la fecha local del navegador para calcular el mes actual.
router.get('/api/stats', verifyAuth, async (req, res) => {
  try {
    const stats = await statsLogic.getStats(req.user._id, req.query.today);
    res.json(stats);
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

module.exports = router;
