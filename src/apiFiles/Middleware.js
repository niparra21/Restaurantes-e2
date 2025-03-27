const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const pool = require('./db');
const { getAdminToken } = require('./keycloak');
const axios = require('axios');

const client = jwksClient({
  jwksUri: process.env.KEYCLOAK_JWKS_URI || 'http://localhost:8080/realms/restaurant/protocol/openid-connect/certs',
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

  jwt.verify(
    token,
    getKey,
    {
      issuer: process.env.KEYCLOAK_ISSUER,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        console.error('Error verificando token JWT:', err.message);
        return res.status(403).json({ message: 'Token no válido', error: err.message });
      }

      req.user = {
        id: decoded.sub,
        username: decoded.preferred_username,
        email: decoded.email,
        role: decoded.realm_access?.roles?.includes('admin') ? 'admin' : 'user',
      };

      next();
    }
  );
};

const isAdmin = async (req, res, next) => {
  const keycloakIdFromToken = req.user.id;
  try {
    const adminToken = await getAdminToken();
    const rolesResponse = await axios.get(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakIdFromToken}/role-mappings/realm`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    const roles = rolesResponse.data.map(role => role.name);
    if (roles.includes('admin')) {
      return next();
    }
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
  } catch (error) {
    console.error('Error en isAdmin:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return res.status(500).json({
      message: 'Error validando permisos de administrador',
      error: error.response?.data || error.message
    });
  }
  
};


const canEdit = async (req, res, next) => {
  const usernameFromToken = req.user.username; 
  const userIdToEdit = req.params.id;       

  try {
    const result = await pool.query(
      'SELECT keycloak_id FROM users WHERE id = $1',
      [userIdToEdit]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    const keycloakIdToEdit = result.rows[0].keycloak_id;
    if (req.user.id === keycloakIdToEdit) {
      return next();
    }
    return res.status(403).json({ message: 'No tienes permiso para editar este usuario.' });
  } catch (error) {
    console.error('Error en canEdit:', error.response?.data || error.message);
    return res.status(500).json({ message: 'Error validando permisos', error });
  }
};

const canSeeOrder = async (req, res, next) => {
  const userIdFromToken = req.user.id;
  const userRole = req.user.role;
  const orderId = req.params.id;
  const result = await pool.query(
    'SELECT user_id FROM orders WHERE id = $1',
    [orderId]
  );
  const order = result.rows[0];
  if (userIdFromToken === order.user_id || userRole === 'admin') {
    return next();
  }

  return res.status(403).json({ message: 'No tienes permiso para acceder a esta orden.' });
};

module.exports = { authenticateJWT, isAdmin, canEdit, canSeeOrder };
