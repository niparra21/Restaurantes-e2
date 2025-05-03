const pool = require('../../db');

class MenuDAOPostgres {
    
    async registerMenu(restaurantID, name, description){
        try {
            const result = await pool.query(
                'INSERT INTO menus (restaurant_id, name, description) VALUES ($1, $2, $3) RETURNING *',
                [restaurantID, name, description]
            );
            return result.rows[0];
        } catch (error) {
            console.error("Error al registrar menú:", error);
            throw error;
        }
    }

    async getMenu() {
        try {
            const result = await pool.query(
                'SELECT id, restaurant_id, name, description FROM menus WHERE id = $1',
                [req.params.id]
              );
            return result.rows;
        } catch (error) {
            console.error("Error al obtener menú:", error);
            throw error;
        }
    }

    async updateMenu(restaurantID, name, description){
        try {
            const result = await pool.query(
                'UPDATE menus SET restaurant_id = $1, name = $2, description = $3 WHERE id = $4 RETURNING *',
                [restaurantID, name, description]
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