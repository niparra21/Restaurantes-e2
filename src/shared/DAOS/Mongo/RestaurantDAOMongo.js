const { ObjectId } = require('mongodb');

class RestaurantDAOMongo {
  constructor(db) {
    this.collection = db.collection('restaurants'); 
  }
  
  async registerRestaurant(name, address, phone, owner_id) {
    try {
      const result = await this.collection.insertOne({
        name,
        address,
        phone,
        owner_id: new ObjectId(owner_id), // Referencia al user
        created_at: new Date(),
        updated_at: new Date()
      });
      return await this.collection.findOne({ _id: result.insertedId }); // Devolver documento insertado
    } catch (error) {
      console.error("Error al registrar restaurante en MongoDB:", error);
      throw error;
    }
  }
  
  async getRestaurants() {
    try {
      const restaurants = await this.collection
      .find({}, { projection: { name: 1, address: 1, phone: 1, owner_id: 1 } })
      .toArray();
      return restaurants;
    } catch (error) {
      console.error("Error al obtener restaurantes en MongoDB:", error);
      throw error;
    }
  }
}

module.exports = RestaurantDAOMongo;
