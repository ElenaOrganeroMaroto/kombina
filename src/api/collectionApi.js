const express = require('express');
const router = express.Router();
const collectionLogic = require('../logic/collectionLogic');
const { statusOf } = require('../logic/errors');

// Obtener todas las colecciones de un usuario
router.get('/api/collections', async (req, res) => {
  try {
    const collections = await collectionLogic.getCollections(req.query.userId);
    res.json(collections);
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

// Crear una nueva colección
router.post('/api/collections', async (req, res) => {
  try {
    const newCollection = await collectionLogic.addCollection(req.body);
    res.status(201).json(newCollection);
  } catch (error) {
    res.status(statusOf(error, 400)).json({ error: error.message });
  }
});

// Renombrar una colección
router.put('/api/collections/:id', async (req, res) => {
  try {
    const updated = await collectionLogic.renameCollection(req.params.id, req.body.name);
    res.json(updated);
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

// Eliminar una colección
router.delete('/api/collections/:id', async (req, res) => {
  try {
    const deleted = await collectionLogic.removeCollection(req.params.id);
    res.json({ message: 'Colección eliminada', deleted });
  } catch (error) {
    res.status(statusOf(error, 500)).json({ error: error.message });
  }
});

module.exports = router;