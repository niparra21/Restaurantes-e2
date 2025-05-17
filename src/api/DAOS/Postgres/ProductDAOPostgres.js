const pool = require('../../db');

class ProductDAOPostgres {

  async registerProduct(name, description, price, category, restaurant_id, is_active) {
    try {
      const result = await pool.query(
        'INSERT INTO products (name, description, price, category, restaurant_id, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *',
        [name, description, price, category, restaurant_id, is_active]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error al registrar producto:", error);
      throw error;
    }
  }

  async getProducts() {
    const result = await pool.query('SELECT id, name, description, price, category, restaurant_id, is_active FROM products');
    return result.rows;
  } catch (error) {
    console.error("Error al obtener productos:", error);
    throw error;
  }

  async deleteProduct(id) {
    try {
      const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      throw error;
    }
  }

}

module.exports = ProductDAOPostgres;