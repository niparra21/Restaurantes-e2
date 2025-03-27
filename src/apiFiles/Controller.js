const express = require('express');
const app = express();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const axios = require('axios');
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
    const user = await pool.query(
      'SELECT id, username, email, role FROM users WHERE keycloak_id = $1',
      [req.user.id]
    );
    res.json(user.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo usuario', error });
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
    const result = await pool.query(
      `INSERT INTO restaurants (name, address, phone, owner_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, address, phone, owner_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al registrar restaurante:", error);
    res.status(500).json({ message: "Error registrando restaurante", error });
  }
};

const getRestaurants = async (req, res) => {
  try {
    const menu = await pool.query(
      'SELECT id, name, address, phone, owner_id FROM restaurants',
    );
    res.json(menu.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo restaurantes', error });
  }
};



const registerMenu = async (req, res) => {
  const { restaurantID, name, description } = req.body;
  try{
    const result = await pool.query(
      'INSERT INTO menus (restaurant_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [restaurantID, name, description]
    );
    res.status(201).json(result.rows[0]);
  }catch (error) {
    res.status(500).json({ message: 'Error registrando menu', error });
  }
};

const getMenu = async (req, res) => {
  try {
    const menu = await pool.query(
      'SELECT id, restaurant_id, name, description FROM menus WHERE id = $1',
      [req.params.id]
    );
    res.json(menu.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo menu', error });
  }
};

const updateMenu = async (req, res) => {
  const { restaurantID, name, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE menus SET restaurant_id = $1, name = $2, description = $3 WHERE id = $4 RETURNING *',
      [restaurantID, name, description, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando menu', error });
  }
};

const deleteMenu = async (req, res) => {
  try {
    await pool.query('DELETE FROM menus WHERE id = $1', [req.params.id]);
    res.json({ message: 'Menu eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ message: 'Error eliminando menu', error });
  }
};

const getOrder = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, user_id, restaurant_id, menu_id, order_time, status FROM orders WHERE id = $1',
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo la orden', error });
  }
};

module.exports = {registerUser,loginUser,getUser,updateUser,deleteUser,registerMenu,getMenu,updateMenu,deleteMenu,getOrder,registerRestaurant,getRestaurants};
