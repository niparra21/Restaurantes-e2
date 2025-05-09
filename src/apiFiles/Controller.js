/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

const express = require('express');
const app = express();
const bcrypt = require('bcryptjs');
const axios = require('axios');
const DAOFactory = require('./DAOFactory');
const redis = require('ioredis');
const { getAdminToken } = require('./keycloak');

app.use(express.json());

const redisClient = new redis(process.env.REDIS_URL || 'redis://localhost:6379');

redisClient.on('connect', () => {
  console.log('✅ Conectado a Redis');
});

redisClient.on('error', (err) => {
  console.error('❌ Error de Redis:', err);
});

/* This code are the controllers for the API endpoints
 * Each function is responsible for handling a specific request
 * Features:
 *  - Redis caching layer for performance
 *  - Multi-database support (PostgreSQL/MongoDB)
 *  - DAO pattern implementation for data access abstraction
 */ 

/* ============================================================================================== */
// AUTHENTICATION

const cloneUserToMongo = async (req, res) => {
  const { keycloak_id } = req.body;

  if (!keycloak_id) {
    return res.status(400).json({ error: "Se requiere el keycloak_id" });
  }

  try {

    const { userDAO: postgresUserDAO } = DAOFactory('postgres', null);
    const existingUser = await postgresUserDAO.getUserByKeycloakId(keycloak_id);

    if (!existingUser) {
      return res.status(404).json({ error: "Usuario no encontrado en PostgreSQL" });
    }

    // Preparar instancia Mongo
    const dbInstance = await require('./dbMongo')();
    const { userDAO: mongoUserDAO } = DAOFactory('mongo', dbInstance);

    // Insertar en MongoDB usando el mismo keycloak_id
    const createdUser = await mongoUserDAO.createUser(
      existingUser.username,
      existingUser.password,
      existingUser.email,
      existingUser.role,
      existingUser.keycloak_id
    );

    res.status(201).json({
      message: "Usuario clonado exitosamente en MongoDB",
      user: {
        id: createdUser._id,
        username: createdUser.username,
        email: createdUser.email,
        role: createdUser.role,
        keycloak_id: createdUser.keycloak_id
      }
    });

  } catch (error) {
    console.error("Error clonando usuario a MongoDB:", error);
    res.status(500).json({
      message: "Error clonando usuario a MongoDB",
      error: error.message || error
    });
  }
};



const loginUser = async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const response = await axios.post(
        `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: process.env.KEYCLOAK_CLIENT_ID,
          username,
          password
        }),
        {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded' 
          }
        }
      );
  
      res.json({ 
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token 
      });
  
    } catch (error) {
      console.error('Error en login:', {
        url: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        error: error.response?.data 
      });
      
      res.status(401).json({
        message: 'Error de autenticación',
        error: error.response?.data || error.message
      });
    }
  };
  
/* ============================================================================================== */
// USERS

const registerUser = async (req, res) => {
  const { username, password, email, role } = req.body;

  try {
    if (!username || !password || !email || !role) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    if (typeof password !== 'string' || password.trim() === '') {
      return res.status(400).json({ error: "Contraseña inválida" });
    }

    const dbType = process.env.DB_TYPE;                                                             // 'postgres' o 'mongo'
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;
    const { userDAO } = DAOFactory(dbType, dbInstance);

    // Verificar si el usuario ya existe
    const existingUser = await userDAO.findUserByEmailOrUsername(email, username);
    const userExists = dbType === 'postgres' ? existingUser.length > 0 : !!existingUser;

    if (userExists) {
        return res.status(409).json({ error: "Usuario o email ya registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminToken = await getAdminToken();

    const userResponse = await axios.post(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`,
      {
        username,
        email,
        firstName: username,
        lastName: "-",
        enabled: true,
        emailVerified: true,
        credentials: [{
          type: "password",
          value: password,
          temporary: false
        }]
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    const locationHeader = userResponse.headers.location;
    if (!locationHeader) {
      throw new Error("No se pudo obtener el ID del usuario desde Keycloak");
    }
    const keycloakId = locationHeader.split('/').pop();

    const newUser = await userDAO.createUser(username, hashedPassword, email, role, keycloakId);

    const roleResponse = await axios.get(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/roles/${role}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    await axios.post(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}/role-mappings/realm`,
      [roleResponse.data],
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    res.status(201).json({
      id: newUser.id || newUser._id,                                                                // PostgreSQL usa `id`, MongoDB usa `_id`
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      keycloak_id: newUser.keycloak_id
    });

  } catch (error) {
    console.error('Error detallado al registrar usuario:', {
      keycloakError: error.response?.data,
      mensaje: error.message
    });

    res.status(500).json({
      message: "Error registrando usuario",
      error: error.response?.data?.errorMessage || error.message
    });
  }
};

const getUser = async (req, res) => {
  try {
    const dbType = process.env.DB_TYPE;                                                             // 'postgres' o 'mongo'
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;                    // Instancia de MongoDB si es necesario
    const { userDAO } = DAOFactory(dbType, dbInstance);                                             // Obtiene el DAO dinámico

    // Llama al método del DAO para obtener el usuario
    const user = await userDAO.findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error obteniendo usuario', error: error.message || error });
  }
};

const updateUser = async (req, res) => {
  const { email, role } = req.body;
  

  try {
    const dbType = process.env.DB_TYPE;                                                             // 'postgres' o 'mongo'
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;                    // Instancia de MongoDB si es necesario
    const { userDAO } = DAOFactory(dbType, dbInstance);                                             // Obtiene el DAO dinámico

    // Buscar usuario por ID
    const existingUser = await userDAO.findUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const keycloakId = existingUser.keycloak_id;

    // Obtener token de administrador de Keycloak
    const adminToken = await getAdminToken();

    // Actualizar el correo electrónico en Keycloak
    await axios.put(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}`,
      {
        email,
        lastName: "-",
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Obtener roles actuales del usuario en Keycloak
    const currentRolesResponse = await axios.get(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}/role-mappings/realm`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    // Eliminar roles actuales en Keycloak
    if (currentRolesResponse.data.length > 0) {
      await axios.delete(
        `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}/role-mappings/realm`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
          data: currentRolesResponse.data,
        }
      );
    }

    // Asignar nuevo rol en Keycloak
    const newRoleResponse = await axios.get(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/roles/${role}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    await axios.post(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}/role-mappings/realm`,
      [newRoleResponse.data],
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    // Actualizar usuario en la base de datos
    const updatedUser = await userDAO.updateUser(userId, email, role);

    res.json(updatedUser);
  } catch (error) {
    console.error('Error actualizando usuario:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error actualizando usuario', error });
  }
};


const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const dbType = process.env.DB_TYPE;                                                             // 'postgres' o 'mongo'
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;                    // Instancia de MongoDB si es necesario
    const { userDAO } = DAOFactory(dbType, dbInstance);                                             // Obtiene el DAO dinámico

    // Buscar usuario por ID
    const existingUser = await userDAO.findUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const keycloakId = existingUser.keycloak_id;

    // Obtener token de administrador de Keycloak
    const adminToken = await getAdminToken();

    // Eliminar usuario en Keycloak
    await axios.delete(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    // Eliminar usuario en la base de datos
    await userDAO.deleteUser(userId);

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error eliminando usuario', error });
  }
};

/* ============================================================================================== */
// RESTAURANTS

/* Handles all restaurant-related operations:
 * - Restaurant registration (POST)
 * - Restaurant listing (GET)
 */

/* --------------------------------------------------------------------- */
// POST - REGISTER RESTAURANT

const registerRestaurant = async (req, res) => {
  const { name, address, phone, owner_id } = req.body;
  try {
    // 1. get the db type to redirect to the correct DAO
    const dbType = process.env.DB_TYPE;                                                             // could be 'postgres' o 'mongo'
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;                    // calls the dbMongo function if it's mongo
    const { restaurantDAO } = DAOFactory(dbType, dbInstance);                                       // get the DAO dynamically

    const newRestaurant = await restaurantDAO.registerRestaurant(name, address, phone, owner_id);   // get DAO method to register restaurant
    console.log('Deleted restaurants from Redis');                                                  // log a message 

    // 2. remove cache and return
    await redisClient.del('restaurants:all');                                                       // delete the cache of all restaurants
    res.status(201).json(newRestaurant);                                                            // answer with the new restaurant
  } catch (error) {
    console.error("Error al registrar restaurante:", error);                                        // log the error
    res.status(500).json({                                                                          // and answer with a 500 error
      message: "Error registrando restaurante", 
      error: error.message || error 
    });
  }
};

/* --------------------------------------------------------------------- */
// GET - ALL RESTAURANTS

const getRestaurants = async (req, res) => {
  const cacheKey = 'restaurants:all';                                                               // unique key for this query
  const cacheExpiration = 3600;                                                                     // expiration time = 1 hour in seconds

  try {
    // 1. try to connect to redis
    const cachedRestaurants = await redisClient.get(cacheKey);                                      // get info from cache
    if (cachedRestaurants){                                                                         // if info is in cache
      console.log('Got restaurants from Redis');                                                    // log a message 
      return res.json(JSON.parse(cachedRestaurants));                                               // and return cached info
    }

    // 2. if there is no cache for this, look in db
    const dbType = process.env.DB_TYPE;                                                             // type of db currently using (postres or mong)
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;                    // initialize process
    const { restaurantDAO } = DAOFactory(dbType, dbInstance);                                       // get the DAO

    const restaurants = await restaurantDAO.getRestaurants();                                       // call the DAO's method to get restaurants

    // 3. save info in Redis
    await redisClient.setex(cacheKey, cacheExpiration, JSON.stringify(restaurants));                // save info in Redis with expiration time
    console.log('Stored restaurants in Redis');                                                     // log a message
    res.json(restaurants);                                                                          // return the restaurants
  } catch (error) {                                                                                 // if there is an error
    console.error('Error obteniendo restaurantes:', error);                                         // log the error
    res.status(500).json({                                                                          // and return a 500 error
      message: 'Error obteniendo restaurantes',
      error: error.message || error
    });
  }
};

/* ============================================================================================== */
// MENUS

/* Handles all menu-related operations:
 * - Menu registration (POST)
 * - Menu information (GET)
 * - Menu update (PUT)
 * - Menu deletion (DELETE)
 */

/* --------------------------------------------------------------------- */
// POST - CREATE MENU

const registerMenu = async (req, res) => {
  const { restaurant_id, name, description } = req.body;
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; 
    const { menuDAO } = DAOFactory(dbType, dbInstance); 

    const newMenu = await menuDAO.registerMenu(restaurant_id, name, description);
    await redisClient.del(`menu:${newMenu.id}`);

    res.status(201).json(newMenu);
  } catch (error) {
    console.error('Error registrando menú:', error);
    res.status(500).json({ message: 'Error registrando menú', error: error.message || error });
  }
};

/* --------------------------------------------------------------------- */
// GET - MENU BY ID

const getMenu = async (req, res) => {
  const cacheKey = `menu:${req.params.id}`;                                                         // unique cache key
  const cacheExpiration = 3600                                                                      // expiration time = 1 hour in seconds

  try {
    // 1. try to connect to redis
    const cachedMenu = await redisClient.get(cacheKey);                                             // get info from cache
    if (cachedMenu) {                                                                               // if info is in cache
      console.log("Got menu from Redis");                                                           // log a message
      res.set('X-Cache', 'HIT');
      return res.json(JSON.parse(cachedMenu));                                                      // return the cached info
    }

    // 2. if there is no cache for this, look in db
    const dbType = process.env.DB_TYPE;                                                             // type of db currently using (postgres or mongo)
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;                    // initialize process
    const { menuDAO } = DAOFactory(dbType, dbInstance);                                             // get the DAO
    
    const menu = await menuDAO.getMenu(req.params.id);                                              // get the menu from db

    if (!menu) {                                                                                    // if menu is not found
      return res.status(404).json({ message: 'Menú no encontrado' });                               // return 404
    }

    // 3. save info in redis
    await redisClient.setex(cacheKey, cacheExpiration, JSON.stringify(menu));                       // save info in cache with expiration time
    res.set('X-Cache', 'MISS');
    res.json(menu);                                                                                 // return the menu
  } catch (error) {                                                                                 // if there is an error
    console.error('Error obteniendo menú:', error);                                                 // log the error
    res.status(500).json({                                                                          // and return 500 error
      message: 'Error obteniendo menú', 
      error: error.message || error 
    }); 
  }
};

/* --------------------------------------------------------------------- */
// PUT - UPDATE MENU BY ID

const updateMenu = async (req, res) => {
  const { restaurant_id, name, description } = req.body;
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;  
    const { menuDAO } = DAOFactory(dbType, dbInstance); 
  
    const updatedMenu = await menuDAO.updateMenu(req.params.id, restaurant_id, name, description);
    await redisClient.del(`menu:${updatedMenu.id}`);

    res.json(updatedMenu);
  } catch (error) {
    console.error('Error actualizando menú:', error);
    res.status(500).json({ message: 'Error actualizando menú', error: error.message || error });
  }
};

/* --------------------------------------------------------------------- */
// DEL - DELETE MENU BY ID

const deleteMenu = async (req, res) => {
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; 
    const { menuDAO } = DAOFactory(dbType, dbInstance); 

    const deletedMenu = await menuDAO.deleteMenu(req.params.id);
    await redisClient.del(`menu:${deletedMenu.id}`);

    res.json({ message: 'Menú eliminado correctamente.', menu: deletedMenu });
  } catch (error) {
    console.error('Error eliminando menú:', error);
    res.status(500).json({ message: 'Error eliminando menú', error: error.message || error });
  }
};

/* ============================================================================================== */
// RESERVATIONS

const registerReservation = async (req, res) => {
  const { user_id, restaurant_id, reservation_time } = req.body;
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; 
    const { reservationDAO } = DAOFactory(dbType, dbInstance); 

    
    const newReservation = await reservationDAO.registerReservation(user_id, restaurant_id, reservation_time);

    res.status(201).json(newReservation);
  } catch (error) {
    console.error('Error registrando reserva:', error);
    res.status(500).json({ message: 'Error registrando reserva', error: error.message || error });
  }
};

const deleteReservation = async (req, res) => {
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; 
    const { reservationDAO } = DAOFactory(dbType, dbInstance); 

    
    const deletedReservation = await reservationDAO.deleteReservation(req.params.id);

    res.json({ message: 'Reservación eliminada correctamente.', reservation: deletedReservation });
  } catch (error) {
    console.error('Error eliminando reserva:', error);
    res.status(500).json({ message: 'Error eliminando reserva', error: error.message || error });
  }
};

/* ============================================================================================== */
// ORDERS

const registerOrder = async (req, res) => {
  const { user_id, restaurant_id, menu_id, order_time, status } = req.body;
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; 
    const { orderDAO } = DAOFactory(dbType, dbInstance); 

    
    const newOrder = await orderDAO.registerOrder(user_id, restaurant_id, menu_id, order_time, status);

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error registrando orden:', error);
    res.status(500).json({ message: 'Error registrando orden', error: error.message || error });
  }
};

const getOrder = async (req, res) => {
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; 
    const { orderDAO } = DAOFactory(dbType, dbInstance); 

    
    const order = await orderDAO.getOrder(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error obteniendo orden:', error);
    res.status(500).json({ message: 'Error obteniendo orden', error: error.message || error });
  }
};

module.exports = {registerUser,cloneUserToMongo,loginUser,getUser,updateUser,deleteUser,registerMenu,getMenu,updateMenu,deleteMenu,getOrder,registerRestaurant,getRestaurants,registerReservation,deleteReservation,registerOrder};
