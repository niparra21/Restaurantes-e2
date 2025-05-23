/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

/*
This code is a MongoDB Data Access Object (DAO) for managing menus in a restaurant application.
It provides methods to register, retrieve, update, and delete menus from the postgres database.
*/ 

const pool = require('../../db');

class MenuDAOPostgres {
  
  async registerMenu(restaurant_id, name, description){
    try {
      const result = await pool.query(
        'INSERT INTO menus (restaurant_id, name, description) VALUES ($1, $2, $3) RETURNING *',
        [restaurant_id, name, description]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error al registrar menú:", error);
      throw error;
    }
  }
  
  async getMenu(menuId) {
    try {
      const result = await pool.query(
        'SELECT id, restaurant_id, name, description FROM menus WHERE id = $1',
        [menuId]
      );
      return result.rows;
    } catch (error) {
      console.error("Error al obtener menú:", error);
      throw error;
    }
  }
  
  async updateMenu(menuId, restaurant_id, name, description){
    try {
      const result = await pool.query(
        'UPDATE menus SET restaurant_id = $2, name = $3, description = $4 WHERE id = $1 RETURNING *',
        [menuId, restaurant_id, name, description]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error al actualizar menú:", error);
      throw error;
    }
  }
  
  async deleteMenu(id) {
    try {
      const result = await pool.query(
        'DELETE FROM menus WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error al eliminar menú:", error);
      throw error;
    }
  }
  
}

module.exports = MenuDAOPostgres;