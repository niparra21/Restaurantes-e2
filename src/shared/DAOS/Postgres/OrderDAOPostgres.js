/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

/**
 * This code is a MongoDB Data Access Object (DAO) for managing orders in a restaurant application.
 * It provides methods to register and retrieve orders from the postgres database.
 */ 

const pool = require('../../db'); 

class OrderDAOPostgres {
    
    async registerOrder(user_id, restaurant_id, menu_id, order_time, status){
        try {
            const result = await pool.query(
                `INSERT INTO orders (user_id, restaurant_id, menu_id, order_time, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
                [user_id, restaurant_id, menu_id, order_time, status]
              );
            return result.rows[0];
        } catch (error) {
            console.error("Error al registrar pedido:", error);
            throw error;
        }
    }

    async getOrder(id){
        try {
            const result = await pool.query(
                `SELECT id, user_id, restaurant_id, menu_id, order_time, status FROM orders WHERE id = $1`,
                [id]
            );
            return result.rows[0];
        } catch (error) {
            console.error("Error al obtener pedido:", error);
            throw error;
        }
    }

}

module.exports = OrderDAOPostgres;