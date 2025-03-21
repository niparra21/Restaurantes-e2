const express = require('express');
const { registerUser , loginUser  } = require('./Controller');
const { authenticateJWT } = require('./Middleware');

const router = express.Router();

router.post('/auth/register', registerUser );
router.post('/auth/login', loginUser );
// Add other routes for users, restaurants, menus, reservations, and orders.

// CRUD de usuarios
router.get('/users/me', authenticateJWT, getUser);
router.put('/users/:id', authenticateJWT, canEditUser, updateUser);
router.delete('/users/:id', authenticateJWT, isAdmin, deleteUser);

module.exports = router;