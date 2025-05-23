/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

/*
This code is a MongoDB Data Access Object (DAO) for managing restaurants in a restaurant application.
It provides methods to register and retrieve restaurants from the POSTGRES database.
*/ 
const pool = require('../../db');

class RestaurantDAOPostgres {
  
  async registerRestaurant(name, address, phone, owner_id){
    try {
      const result = await pool.query(
        `INSERT INTO restaurants (name, address, phone, owner_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *`,
        [name, address, phone, owner_id]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error al registrar restaurante:", error);
      throw error;
    }
    
  }
  
  async getRestaurants() {
    try {
      const result = await pool.query('SELECT id, name, address, phone, owner_id FROM restaurants');
      return result.rows;
    } catch (error) {
      console.error("Error al obtener restaurantes:", error);
      throw error;
    }
  }
  
}

module.exports = RestaurantDAOPostgres;