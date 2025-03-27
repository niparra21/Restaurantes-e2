const express = require('express');
const {registerUser,loginUser,getUser,updateUser,deleteUser,registerMenu,getMenu,updateMenu,deleteMenu,getOrder,registerRestaurant,getRestaurants} = require('./Controller');
const {authenticateJWT,isAdmin,canEdit,canSeeOrder} = require('./Middleware');

const router = express.Router();

router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);

// CRUD de usuarios
router.get('/users/me', authenticateJWT, getUser);
router.put('/users/:id', authenticateJWT, canEdit, updateUser);
router.delete('/users/:id', authenticateJWT, canEdit, deleteUser);

// CRUD de restaurante
router.post('/restaurants', authenticateJWT, isAdmin, registerRestaurant);
router.get('/restaurants', authenticateJWT, getRestaurants);

// CRUD de menú
router.post('/menus', authenticateJWT, isAdmin, registerMenu);
router.get('/menus/:id', authenticateJWT, getMenu);
router.put('/menus/:id', authenticateJWT, isAdmin, updateMenu);
router.delete('/menus/:id', authenticateJWT, isAdmin, deleteMenu);

// CRUD de pedido
router.get('/orders/:id', authenticateJWT, canSeeOrder, getOrder);

module.exports = router;
