/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

const express = require('express');
const { searchProducts } = require('./Controller');
const { authenticateJWT, isAdmin } = require('./shared/Middleware');

const router = express.Router();

// ELASTIC
router.get('/products', authenticateJWT, isAdmin, searchProducts);

router.get('/', (req, res) => {
    res.send('API funcionando correctamente en /api');
});

module.exports = router;