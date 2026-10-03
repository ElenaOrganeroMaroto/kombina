const express = require('express');
const router = express.Router();
const clothingLogic = require('../logic/clothingLogic');
const { statusOf } = require('../logic/errors');

// Obtener todas las prendas de un usuario
router.get('/api/clothing', async (req, res) => {
  try {
    const items = await clothingLogic.getClothing(req.query.userId);
    res.json(items);
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

// Guardar una nueva prenda
router.post('/api/clothing', async (req, res) => {
  try {
    const savedItem = await clothingLogic.addClothing(req.body);
    res.status(201).json({ message: 'Prenda guardada con éxito', item: savedItem });
  } catch (error) {
    res.status(statusOf(error, 400)).json({ error: error.message });
  }
});

// Actualizar una prenda (nombre y/o categoría)
router.put('/api/clothing/:id', async (req, res) => {
  try {
    const updated = await clothingLogic.updateClothing(req.params.id, req.body);
    res.json({ message: 'Prenda actualizada', item: updated });
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

// Eliminar una prenda
router.delete('/api/clothing/:id', async (req, res) => {
  try {
    const deleted = await clothingLogic.removeClothing(req.params.id);
    res.json({ message: 'Prenda eliminada con éxito', deleted });
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

module.exports = router;