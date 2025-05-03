const express = require('express');
const app = express();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const axios = require('axios');
const DAOFactory = require('./DAOFactory');
const { getAdminToken } = require('./keycloak');
app.use(express.json());

const registerUser = async (req, res) => {
  const { username, password, email, role } = req.body;

  try {
    if (!username || !password || !email || !role) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    if (typeof password !== 'string' || password.trim() === '') {
      return res.status(400).json({ error: "Contraseña inválida" });
    }

    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (existingUser.rows.length > 0) {
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

    const result = await pool.query(
      'INSERT INTO users (username, password, email, role, keycloak_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [username, hashedPassword, email, role, keycloakId]
    );

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
      id: result.rows[0].id,
      username: result.rows[0].username,
      email: result.rows[0].email,
      role: result.rows[0].role,
      keycloak_id: result.rows[0].keycloak_id
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
  

  const getUser = async (req, res) => {
    try {
      const dbType = process.env.DB_TYPE; // 'postgres' o 'mongo'
      const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; // Instancia de MongoDB si es necesario
      const { userDAO } = DAOFactory(dbType, dbInstance); // Obtiene el DAO dinámico
  
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
  const userId = req.params.id;

  try {
    const result = await pool.query('SELECT keycloak_id FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const keycloakId = result.rows[0].keycloak_id;

    const adminToken = await getAdminToken();

    await axios.put(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}`,
      {
        email,
        lastName: "-", 
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    const currentRolesResponse = await axios.get(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}/role-mappings/realm`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      }
    );

    if (currentRolesResponse.data.length > 0) {
      await axios.delete(
        `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}/role-mappings/realm`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`
          },
          data: currentRolesResponse.data
        }
      );
    }

    const newRoleResponse = await axios.get(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/roles/${role}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    await axios.post(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}/role-mappings/realm`,
      [newRoleResponse.data],
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    const updated = await pool.query(
      'UPDATE users SET email = $1, role = $2 WHERE id = $3 RETURNING *',
      [email, role, userId]
    );
    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Error actualizando usuario:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error actualizando usuario', error });
  }
};



const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await pool.query('SELECT keycloak_id FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const keycloakId = result.rows[0].keycloak_id;

    const adminToken = await getAdminToken();

    await axios.delete(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error eliminando usuario', error });
  }
};


const registerRestaurant = async (req, res) => {
  const { name, address, phone, owner_id } = req.body;
  try {
    const dbType = process.env.DB_TYPE; // 'postgres' o 'mongo'
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; // Instancia de MongoDB si es necesario
    const { restaurantDAO } = DAOFactory(dbType, dbInstance); // Obtiene el DAO dinámico

    // Llama al método del DAO para registrar el restaurante
    const newRestaurant = await restaurantDAO.registerRestaurant(name, address, phone, owner_id);

    res.status(201).json(newRestaurant); // Devuelve el restaurante registrado
  } catch (error) {
    console.error("Error al registrar restaurante:", error); // Log detallado
    res.status(500).json({ 
      message: "Error registrando restaurante", 
      error: error.message || error 
    });
  }
};

const getRestaurants = async (req, res) => {
  try {
    const dbType = process.env.DB_TYPE; // 'postgres' o 'mongo'
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; // Instancia de MongoDB si es necesario
    const { restaurantDAO } = DAOFactory(dbType, dbInstance); // Obtiene el DAO dinámico

    const restaurants = await restaurantDAO.getRestaurants(); // Llama al método del DAO
    res.json(restaurants);
  } catch (error) {
    console.error('Error obteniendo restaurantes:', error); // Log detallado
    res.status(500).json({ 
      message: 'Error obteniendo restaurantes', 
      error: error.message || error 
    });
  }
};

const registerMenu = async (req, res) => {
  const { restaurantID, name, description } = req.body;
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; 
    const { menuDAO } = DAOFactory(dbType, dbInstance); 

   
    const newMenu = await menuDAO.registerMenu(restaurantID, name, description);

    res.status(201).json(newMenu);
  } catch (error) {
    console.error('Error registrando menú:', error);
    res.status(500).json({ message: 'Error registrando menú', error: error.message || error });
  }
};

const getMenu = async (req, res) => {
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; 
    const { menuDAO } = DAOFactory(dbType, dbInstance); 

    
    const menu = await menuDAO.getMenu(req.params.id);

    if (!menu) {
      return res.status(404).json({ message: 'Menú no encontrado' });
    }

    res.json(menu);
  } catch (error) {
    console.error('Error obteniendo menú:', error);
    res.status(500).json({ message: 'Error obteniendo menú', error: error.message || error });
  }
};

const updateMenu = async (req, res) => {
  const { restaurantID, name, description } = req.body;
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null;  
    const { menuDAO } = DAOFactory(dbType, dbInstance); 

  
    const updatedMenu = await menuDAO.updateMenu(req.params.id, restaurantID, name, description);

    res.json(updatedMenu);
  } catch (error) {
    console.error('Error actualizando menú:', error);
    res.status(500).json({ message: 'Error actualizando menú', error: error.message || error });
  }
};

const deleteMenu = async (req, res) => {
  try {
    const dbType = process.env.DB_TYPE; 
    const dbInstance = dbType === 'mongo' ? await require('./dbMongo')() : null; 
    const { menuDAO } = DAOFactory(dbType, dbInstance); 

    const deletedMenu = await menuDAO.deleteMenu(req.params.id);

    res.json({ message: 'Menú eliminado correctamente.', menu: deletedMenu });
  } catch (error) {
    console.error('Error eliminando menú:', error);
    res.status(500).json({ message: 'Error eliminando menú', error: error.message || error });
  }
};

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

module.exports = {registerUser,loginUser,getUser,updateUser,deleteUser,registerMenu,getMenu,updateMenu,deleteMenu,getOrder,registerRestaurant,getRestaurants,registerReservation,deleteReservation,registerOrder};
