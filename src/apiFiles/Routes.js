const express = require('express');
const {registerUser,cloneUserToMongo,loginUser,getUser,updateUser,deleteUser,registerMenu,getMenu,updateMenu,deleteMenu,getOrder,registerRestaurant,getRestaurants,registerReservation,getReservation,deleteReservation,registerOrder} = require('./Controller');
const {authenticateJWT,isAdmin,canEdit} = require('./Middleware');

const router = express.Router();

router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);
router.post('/clone', cloneUserToMongo);

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

// CRUD de reservaciones
router.post('/reservations', authenticateJWT, registerReservation);
router.get('/reservations/:id', authenticateJWT, getReservation);
router.delete('/reservations/:id', authenticateJWT, deleteReservation);

// CRUD de pedido
router.post('/orders', authenticateJWT, registerOrder);
router.get('/orders/:id', authenticateJWT, getOrder);

module.exports = router;
