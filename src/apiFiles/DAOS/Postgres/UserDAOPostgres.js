const pool = require('../../db');

class UserDAOPostgres {
  async findUserByEmailOrUsername(email, username) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );
      return result.rows;
    } catch (error) {
      console.error("Error al buscar usuario por email o username:", error);
      throw error;
    }
  }
  
  async createUser(username, hashedPassword, email, role, keycloakId) {
    try {
      const result = await pool.query(
        'INSERT INTO users (username, password, email, role, keycloak_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [username, hashedPassword, email, role, keycloakId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error al crear usuario:", error);
      throw error;
    }
  }
  
  async findUserById(userId) {
    console.log(userId);
    try {
      const result = await pool.query(
        'SELECT id, username, email, role, keycloak_id FROM users WHERE id = $1',
        [userId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error al buscar usuario por ID:", error);
      throw error;
    }
  }
  
  async findUserByKeycloakId(keycloakId) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE keycloak_id = $1',
        [keycloakId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error al buscar usuario por Keycloak ID:", error);
      throw error;
    }
  }
  
  async updateUser(userId, email, role) {
    try {
      const result = await pool.query(
        'UPDATE users SET email = $1, role = $2 WHERE id = $3 RETURNING *',
        [email, role, userId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      throw error;
    }
  }
  
  async deleteUser(userId) {
    try {
      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [userId]);
      return result.rows[0];
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      throw error;
    }
  }
}

module.exports = UserDAOPostgres;