const express = require('express');
const router = express.Router();
const calendarLogic = require('../logic/calendarLogic');
const { statusOf } = require('../logic/errors');

// Devuelve las asignaciones del usuario como { 'AAAA-MM-DD': [idOutfit, ...] }
router.get('/api/calendar', async (req, res) => {
  try {
    const map = await calendarLogic.getCalendar(req.query.userId);
    res.json(map);
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

// Fija los outfits de un día (lista vacía = quitar el día)
router.put('/api/calendar/:date', async (req, res) => {
  try {
    const { userId, outfitIds } = req.body;
    const result = await calendarLogic.setDay(userId, req.params.date, outfitIds);
    res.json(result);
  } catch (error) {
    res.status(statusOf(error, 400)).json({ error: error.message });
  }
});

module.exports = router;