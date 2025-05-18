const { ObjectId } = require('mongodb');

class ProductDAOMongo {
  constructor(db) {
    this.collection = db.collection('products');
  }

  async registerProduct(name, description, price, category, restaurant_id, is_active) {
    try {
      const result = await this.collection.insertOne({
        name,
        description,
        price,
        category,
        restaurant_id: new ObjectId(restaurant_id), // Reference to restaurant
        is_active,
        created_at: new Date(),
        updated_at: new Date()
      });
      return await this.collection.findOne({ _id: result.insertedId });
    } catch (error) {
      console.error("Error al registrar producto en MongoDB:", error);
      throw error;
    }
  }

  async getProducts() {
    try {
      const products = await this.collection.find(
        {},
        { projection: { name: 1, description: 1, price: 1, category: 1, restaurant_id: 1, is_active: 1 } }
      ).toArray();
      return products;
    } catch (error) {
      console.error("Error al obtener productos en MongoDB:", error);
      throw error;
    }
  }

  async deleteProduct(id) {
    try {
      const result = await this.collection.findOneAndDelete({ _id: new ObjectId(id) });
      if (!result) {
        throw new Error("Producto no encontrado");
      }
      return result;
    } catch (error) {
      console.error("Error al eliminar producto en MongoDB:", error);
      throw error;
    }
  }
}

module.exports = ProductDAOMongo;