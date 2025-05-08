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
            console.error("Error al obtener restaurantes en PostgreSQL:", error);
            throw error; // Lanza el error para que el controlador lo capture
        }
    }

}

module.exports = RestaurantDAOPostgres;