const express = require('express');
const router = express.Router();
const outfitLogic = require('../logic/outfitLogic');
const { statusOf } = require('../logic/errors');

// Obtener todos los outfits de un usuario
router.get('/api/outfits', async (req, res) => {
  try {
    const outfits = await outfitLogic.getOutfits(req.query.userId);
    res.json(outfits);
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

// Guardar un nuevo outfit
router.post('/api/outfits', async (req, res) => {
  try {
    const savedOutfit = await outfitLogic.addOutfit(req.body);
    res.status(201).json({ message: 'Outfit guardado con éxito', outfit: savedOutfit });
  } catch (error) {
    res.status(statusOf(error, 400)).json({ error: error.message });
  }
});

// Actualizar un outfit (cambiar el nombre o moverlo de colección)
router.put('/api/outfits/:id', async (req, res) => {
  try {
    const updated = await outfitLogic.updateOutfit(req.params.id, req.body);
    res.json({ message: 'Outfit actualizado', outfit: updated });
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

// Eliminar un outfit (también se quita del calendario)
router.delete('/api/outfits/:id', async (req, res) => {
  try {
    const deleted = await outfitLogic.removeOutfit(req.params.id);
    res.json({ message: 'Outfit eliminado', deleted });
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

module.exports = router;