const dbPromise = require('../../db');
const { ObjectId } = require('mongodb');

class RestaurantDAOMongo {

  async registerRestaurant(name, address, phone, owner_id) {
    try {
      const db = await dbPromise;
      const collection = db.collection('restaurants');
      const result = await collection.insertOne({
        name,
        address,
        phone,
        owner_id: new ObjectId(owner_id), // Referencia al user
        created_at: new Date(),
        updated_at: new Date()
      });
      return await collection.findOne({ _id: result.insertedId }); // Devolver documento insertado
    } catch (error) {
      console.error("Error al registrar restaurante en MongoDB:", error);
      throw error;
    }
  }
  
  async getRestaurants() {
    try {
      const db = await dbPromise;
      const collection = db.collection('restaurants');
      const restaurants = await collection
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
