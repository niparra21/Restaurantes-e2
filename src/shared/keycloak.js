/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

const session = require('express-session');
const Keycloak = require('keycloak-connect');
const axios = require('axios');
require('dotenv').config();

const memoryStore = new session.MemoryStore();

const keycloak = new Keycloak({ store: memoryStore }, {
  realm: process.env.KEYCLOAK_REALM,
  'auth-server-url': process.env.KEYCLOAK_URL,
  'ssl-required': 'external',
  resource: process.env.KEYCLOAK_CLIENT_ID,
  'public-client': true,
  'confidential-port': 0
});

const getAdminToken = async () => {
  try {
    const response = await axios.post(
      `${process.env.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: process.env.KEYCLOAK_ADMIN_USERNAME,
        password: process.env.KEYCLOAK_ADMIN_PASSWORD,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const token = response.data.access_token;
    return token;
  } catch (error) {
    console.error('Error obteniendo token de admin:', error.response?.data || error.message);
    throw new Error('No se pudo obtener el token del administrador de Keycloak');
  }
};

module.exports = { keycloak, memoryStore, getAdminToken };
