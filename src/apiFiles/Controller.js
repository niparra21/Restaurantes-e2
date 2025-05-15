/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

// API CONTROLLERS

/* This code are the controllers for the API endpoints
 * Each function is responsible for handling a specific request
 * Features:
 *  - Redis caching layer for performance
 *  - Multi-database support (PostgreSQL/MongoDB)
 *  - DAO pattern implementation for data access abstraction
 */ 

const express = require('express');
const app = express();
const bcrypt = require('bcryptjs');
const axios = require('axios');
const DAOFactory = require('./DAOFactory');
const redis = require('ioredis');
const KeycloakService = require('./KeycloakService');
const { getAdminToken } = require('./keycloak')

app.use(express.json());

const redisClient = new redis(process.env.REDIS_URL);
const elasticClient = require('../../elastic-search/elasticsearchClient');

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

/* --------------------------------------------------------------------- */
// POST - CREATE USER

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

/* --------------------------------------------------------------------- */
// GET - CURRENT LOGGED USER

const getUser = async (req, res) => {
  const cacheKey = `user:${req.user.id}`;                                                           // unique key for this query
  const cacheExpiration = 300;                                                                      // expiration time = 5 minutes in seconds

  try {
    // 1. try to connect to redis
    const cachedUser = await redisClient.get(cacheKey);                                             // get info from cache
    if (cachedUser) {                                                                               // if info is in cache
      console.log("Got user from Redis");                                                           // log a message
      return res.json(JSON.parse(cachedUser));                                                      // return the cached info
    }

    // 2. if there is no cache for this, look in db
    const dbType = process.env.DB_TYPE;                                                             // 'postgres' o 'mongo'
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;                    // Instancia de MongoDB si es necesario
    const { userDAO } = DAOFactory(dbType, dbInstance);                                             // Obtiene el DAO dinámico

    const user = await userDAO.findUserByKeycloakId(req.user.id);

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // 3. save info in redis
    await redisClient.setex(cacheKey, cacheExpiration, JSON.stringify(user));                       // save info in cache with expiration time
    res.json(user);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error obteniendo usuario', error: error.message || error });
  }
};

/* --------------------------------------------------------------------- */
// PUT - UPDATE USER BY ID

const updateUser = async (req, res) => {
  const userId = req.params.id;
  const { email, role } = req.body;

  try {
    // 1. get current db information
    const dbType = process.env.DB_TYPE;
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;
    const { userDAO } = DAOFactory(dbType, dbInstance);

    // 2. check if the user exists
    const existingUser = await userDAO.findUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // 3. update keycloak information
    const adminToken = await getAdminToken();
    await KeycloakService.updateKeycloakUser(
      existingUser.keycloak_id,
      email,
      role,
      adminToken
    );

    // 4. update db information
    const updatedUser = await userDAO.updateUser(userId, email, role);
    
    // 5. remove cache and return updated user
    await redisClient.del(`user:${updatedUser.keycloak_id}`);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error actualizando usuario:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error actualizando usuario', error });
  }
};

/* --------------------------------------------------------------------- */
// DELETE - DELETE USER BY ID

const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    // 1. get current db and user information
    const dbType = process.env.DB_TYPE;
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;
    const { userDAO } = DAOFactory(dbType, dbInstance);

    // 2. check if user exists
    const existingUser = await userDAO.findUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // 3. delete keycloak information
    const adminToken = await getAdminToken();
    await KeycloakService.deleteKeycloakUser(existingUser.keycloak_id, adminToken);

    // 4. delete db information
    const deletedUser = await userDAO.deleteUser(userId);

    await redisClient.del(`user:${deletedUser.keycloak_id}`);
    res.json({ message: 'Usuario eliminado correctamente', user: deletedUser });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ message: 'Error eliminando usuario', error: error.message || error });
  }
};

/* ============================================================================================== */
// RESTAURANTS

/* Handles all restaurant-related operations:
 * - Restaurant registration (POST)
 * - Restaurant listing (GET)
 */

/* --------------------------------------------------------------------- */
// POST - CREATE RESTAURANT

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
    res.status(500).json({ message: "Error registrando restaurante", error: error.message || error });
  }
};

/* --------------------------------------------------------------------- */
// GET - ALL RESTAURANTS

const getRestaurants = async (req, res) => {
  const cacheKey = 'restaurants:all';                                                               // unique key for this query
  const cacheExpiration = 300;                                                                      // expiration time = 5 minutes in seconds

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
    res.status(500).json({ message: 'Error obteniendo restaurantes', error: error.message || error });
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
  const cacheExpiration = 300                                                                       // expiration time = 5 minutes in seconds

  try {
    // 1. try to connect to redis
    const cachedMenu = await redisClient.get(cacheKey);                                             // get info from cache
    if (cachedMenu) {                                                                               // if info is in cache
      console.log("Got menu from Redis");                                                           // log a message
      return res.json(JSON.parse(cachedMenu));                                                      // return the cached info
    }

    // 2. if there is no cache for this, look in db
    const dbType = process.env.DB_TYPE;                                                             // type of db currently using (postgres or mongo)
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;                    // initialize process
    const { menuDAO } = DAOFactory(dbType, dbInstance);                                             // get the DAO
    
    const menu = await menuDAO.getMenu(req.params.id);                                              // get the menu from db

    if (!menu) return res.status(404).json({ message: 'Menú no encontrado' });                      // if no menu found, return 404

    // 3. save info in redis
    await redisClient.setex(cacheKey, cacheExpiration, JSON.stringify(menu));                       // save info in cache with expiration time
    res.json(menu);                                                                                 // return the menu
  } catch (error) {                                                                                 // if there is an error
    console.error('Error obteniendo menú:', error);                                                 // log the error
    res.status(500).json({ message: 'Error obteniendo menú', error: error.message || error }); 
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

/* Handles all reservation-related operations:
 * - Reservation registration (POST)
 * - Reservation deletion (DELETE)
 */

/* --------------------------------------------------------------------- */
// POST - CREATE RESERVATION

const registerReservation = async (req, res) => {
  const { user_id, restaurant_id, reservation_time } = req.body;                                    // extract reservation data from request body

  try {
    const dbType = process.env.DB_TYPE;                                                             // type of db currently using (postgres or mongo)
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;                    // initialize process
    const { reservationDAO } = DAOFactory(dbType, dbInstance);                                      // get DAO instance for reservations

    const newReservation = await reservationDAO.registerReservation(user_id, restaurant_id, reservation_time); // register new reservation in db
    await redisClient.del(`menu:${newReservation.id}`);
    res.status(201).json(newReservation);                                                           // return new reservation
  } catch (error) {
    console.error('Error registrando reserva:', error);                                             // log the error
    res.status(500).json({ message: 'Error registrando reserva', error: error.message || error });
  }
};

/* --------------------------------------------------------------------- */
// GET - RESERVATION BY ID

const getReservation = async (req, res) => {
  const cacheKey = `reservation:${req.params.id}`;                                                  // create cache key for reservation
  const cacheExpiration = 300;                                                                      // cache expiration time in seconds (5 minutes)

  try {
    // 1. try to connect to redis
    const cachedReservation = await redisClient.get(cacheKey);                                      // retrieve reservation from cache
    if (cachedReservation) {                                                                        // if reservation is cached
      console.log("Got reservation from Redis");                                                    // log a message
      return res.json(JSON.parse(cachedReservation));                                               // return cached reservation
    }

    // 2. if there is no cache for this, look in db
    const dbType = process.env.DB_TYPE;                                                             // type of db currently using (postgres or mongo)
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;                    // initialize process
    const { reservationDAO } = DAOFactory(dbType, dbInstance);                                      // get DAO instance for reservations
    
    const reservation = await reservationDAO.getReservation(req.params.id);                         // retrieve reservation from db
    if (!reservation) return res.status(404).json({ message: 'Reserva no encontrada' });            // if reservation is not found, return 404

    // 3. save info in redis
    await redisClient.setex(cacheKey, cacheExpiration, JSON.stringify(reservation));                // save reservation in cache with expiration time
    console.log("Saved reservation to Redis");                                                      // log a message
    res.json(reservation);                                                                          // return reservation
  } catch (error) {
    console.error('Error obteniendo reserva:', error);
    res.status(500).json({ message: 'Error obteniendo reserva', error: error.message || error });
  }
};

/* --------------------------------------------------------------------- */
// DELETE - DELETE RESERVATION BY ID

const deleteReservation = async (req, res) => {
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; 
    const { reservationDAO } = DAOFactory(dbType, dbInstance); 
    
    const deletedReservation = await reservationDAO.deleteReservation(req.params.id);
    await redisClient.del(`reservation:${deletedReservation.id}`);

    res.json({ message: 'Reservación eliminada correctamente.', reservation: deletedReservation });
  } catch (error) {
    console.error('Error eliminando reserva:', error);
    res.status(500).json({ message: 'Error eliminando reserva', error: error.message || error });
  }
};

/* ============================================================================================== */
// ORDERS

/* Handles all orders-related operations:
 * - Order registration (POST)
 * - Order information (GET)
 */

/* --------------------------------------------------------------------- */
// POST - CREATE ORDER

const registerOrder = async (req, res) => {
  const { user_id, restaurant_id, menu_id, order_time, status } = req.body;
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; 
    const { orderDAO } = DAOFactory(dbType, dbInstance); 

    const newOrder = await orderDAO.registerOrder(user_id, restaurant_id, menu_id, order_time, status);
    await redisClient.del(`reservation:${newOrder.id}`);
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error registrando orden:', error);
    res.status(500).json({ message: 'Error registrando orden', error: error.message || error });
  }
};

/* --------------------------------------------------------------------- */
// GET - GET ORDER BY ID

const getOrder = async (req, res) => {
  const cacheKey = `order:${req.params.id}`;                                                        // create cache key for order
  const cacheExpiration = 300;                                                                      // cache expiration time in seconds (5 minutes)

  try {
    // 1. try to connect to redis    
    const cachedOrder = await redisClient.get(cacheKey);                                            // check if order exists in redis
    if (cachedOrder) {                                                                              // if order is cached
      console.log('Got order from Redis');                                                          // log a message
      return res.json(JSON.parse(cachedOrder));                                                     // return cached order
    }

    // 2. if there is no cache for this, look in db
    const dbType = process.env.DB_TYPE;                                                             // type of db currently using (postgres or mongo)
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;                    // initialize process
    const { orderDAO } = DAOFactory(dbType, dbInstance);                                            // get DAO instance for orders
    
    const order = await orderDAO.getOrder(req.params.id);                                           // retrieve order from db
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });                    // if order is not found, return 404

    // 3. save info in redis
    await redisClient.setex(cacheKey, cacheExpiration, JSON.stringify(order));                      // cache order in redis
    console.log('Saved order to Redis');                                                            // log a message
    res.json(order);                                                                                // return order
  } catch (error) {                                                                                 // if there's an error
    console.error('Error obteniendo orden:', error);                                                // log the error
    res.status(500).json({ message: 'Error obteniendo orden', error: error.message || error });     // return 500 error
  }
};

/* ============================================================================================== */
// ELASTIC SEARCH INDEXING

/* --------------------------------------------------------------------- */
// INDEX PRODUCT

const indexProduct = async(product) => {
  try {
    await elasticClient.index({
      index: 'products',
      id: product.id.toString(),
      body: {
        name: product.name,
        description: product.description,
        category: product.category,
        restaurant_id: product.restaurant_id,
        db_id: product.id.toString(),
      }
    });
  } catch (error) {
    console.error('Error indexando producto en ElasticSearch:', error);
  }
};

/* --------------------------------------------------------------------- */
// DELETE PRODUCT FROM ELASTIC

const deleteFromElastic = async (productId) => {
  try {
    await elasticClient.delete({
      index: 'products',
      id: productId.toString()
    });
  } catch (error) {
    if (error.meta?.statusCode !== 404) {
      console.error('Error eliminando producto de ElasticSearch:', error);
    }
  }
}

/* ============================================================================================== */
// PRODUCTS

/* Handles all product-related operations:
 * - Product registration (POST)
 * - Products information (GET)
 * - Product deletion (DELETE)
 */

/* --------------------------------------------------------------------- */
// POST - CREATE PRODUCT

const registerProduct = async (req, res) => {
  const { name, description, price, category, restaurant_id, is_active } = req.body;
  
  try {
    const dbType = process.env.DB_TYPE;
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;
    const { productDAO } = DAOFactory(dbType, dbInstance);

    const newProduct = await productDAO.registerProduct( name, description || 'Producto sin descripción', price, category, restaurant_id, is_active );

    await indexProduct(newProduct);

    await redisClient.del('products:all');
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error registrando producto:', error);
    res.status(500).json({ message: 'Error registrando producto', error: error.message || error });
  }
};

/* --------------------------------------------------------------------- */
// GET - ALL PRODUCTS

const getProducts = async (req, res) => {
  const cacheKey = 'products:all';                                                                  // unique key for this query
  const cacheExpiration = 300;                                                                      // expiration time = 5 minutes in seconds

  try {
    // 1. try to connect to redis
    const cachedProducts = await redisClient.get(cacheKey);                                         // get info from cache
    if (cachedProducts) {                                                                           // if info is in cache
      console.log('Got products from Redis');                                                       // log a message
      res.json(JSON.parse(cachedProducts));                                                         // return cached products
    }

    // 2. if there is no cache for this, look in db
    const dbType = process.env.DB_TYPE;                                                             // type of db currently using (postgres or mongo)
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;                    // initialize process
    const { productDAO } = DAOFactory(dbType, dbInstance);                                          // get product DAO

    const products = await productDAO.getProducts();                                                // call the DAO's method to get products

    // 3. save info in Redis
    await redisClient.setex(cacheKey, cacheExpiration, JSON.stringify(products));                   // save info in Redis with expiration time
    console.log('Stored restaurants in Redis');                                                     // log a message
    res.json(products);                                                                             // return products
  } catch (error) {                                                                                 // if there is an error
    console.error('Error obtiendo productos:', error);                                              // log the error
    res.status(500).json({ message: 'Error obtiendo productos', error: error.message || error });   // return error
  }
};

/* --------------------------------------------------------------------- */
// DELETE - PRODUCT BY ID

const deleteProduct = async (req, res) => {
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; 
    const { productDAO } = DAOFactory(dbType, dbInstance); 

    const deletedProduct = await productDAO.deleteProduct(req.params.id);

    await deleteFromElastic(deletedProduct.id);
    await redisClient.del('products:all');
    //await redisClient.del(`product:${deletedProduct.id}`);

    res.json({ message: 'Producto eliminado correctamente.', product: deletedProduct });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ message: 'Error eliminando producto', error: error.message || error });
  }
};

/* --------------------------------------------------------------------- */
// GET - SEARCH PRODUCTS

const searchProducts = async (req, res) => {
  const { q, category } = req.query;
  
  try {
    let query = {};
    
    if (q && category) {
      query = {
        bool: {
          must: [
            { match: { name: q } },
            { term: { category: category.toLowerCase() } }
          ]
        }
      };
    } else if (q) {
      query = {
        multi_match: {
          query: q,
          fields: ['name^3', 'description', 'category'],
          fuzziness: 'AUTO'
        }
      };
    } else if (category) {
      query = { term: { category: category.toLowerCase() } };
    } else {
      return res.status(400).json({ message: 'Debe proporcionar término de búsqueda (q) o categoría' });
    }

    const { body } = await elasticClient.search({
      index: 'products',
      body: {
        query: query,
        highlight: {
          fields: {
            name: {},
            description: {}
          }
        }
      }
    });

    const results = body.hits.hits.map(hit => ({
      id: hit._source.db_id,
      ...hit._source,
      highlight: hit.highlight
    }));

    res.json(results);
  } catch (error) {
    console.error('Error buscando productos:', error);
    res.status(500).json({ message: 'Error buscando productos', error: error.message || error });
  }
};

module.exports = { registerUser, cloneUserToMongo, loginUser, getUser, updateUser, deleteUser,
  registerMenu, getMenu, updateMenu, deleteMenu, getOrder, registerRestaurant, getRestaurants,
  registerReservation, getReservation, deleteReservation, registerOrder, registerProduct, getProducts,
  deleteProduct, searchProducts };
