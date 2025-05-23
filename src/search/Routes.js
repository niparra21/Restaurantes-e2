/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

const express = require('express');
const { searchProducts, searchByCategory, reindexProducts } = require('./Controller');
const { authenticateJWT, isAdmin } = require('./shared/Middleware');

const router = express.Router();

// ELASTIC
router.get('/products', authenticateJWT, isAdmin, searchProducts);
router.get('/products/category/:category', authenticateJWT, searchByCategory);
router.post('/reindex', authenticateJWT, isAdmin, reindexProducts);

router.get('/', (req, res) => {
    res.send('API funcionando correctamente en /api');
});

module.exports = router;