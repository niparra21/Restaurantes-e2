/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */
const axios = require('axios');

class KeycloakService {
  static async updateKeycloakUser(keycloakId, email, role, adminToken) {
    // 1. Actualizar datos básicos del usuario
    await this._updateUserInfo(keycloakId, email, adminToken);
    // 2. Actualizar roles
    await this._updateUserRoles(keycloakId, role, adminToken);
  }

  static async _updateUserInfo(keycloakId, email, adminToken) {
    await axios.put(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}`,
      {
        email,
        lastName: "-", // Mantenemos este campo como estaba
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  }

  static async _updateUserRoles(keycloakId, newRole, adminToken) {
    // Eliminar roles actuales
    const currentRoles = await this._getCurrentRoles(keycloakId, adminToken);
    if (currentRoles.length > 0) {
      await axios.delete(
        `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}/role-mappings/realm`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: currentRoles,
        }
      );
    }

    // Asignar nuevo rol
    const roleData = await this._getRoleData(newRole, adminToken);
    await axios.post(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}/role-mappings/realm`,
      [roleData],
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
  }

  static async _getCurrentRoles(keycloakId, adminToken) {
    const response = await axios.get(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}/role-mappings/realm`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    return response.data;
  }

  static async _getRoleData(roleName, adminToken) {
    const response = await axios.get(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/roles/${roleName}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    return response.data;
  }

  static async deleteKeycloakUser(keycloakId, adminToken) {
    await axios.delete(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}`,
      {
        headers: { 
          Authorization: `Bearer ${adminToken}` 
        }
      }
    );
  }
}

module.exports = KeycloakService;