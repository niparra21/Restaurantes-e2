const dbPromise = require('../../db');
const { ObjectId } = require('mongodb');

class OrderDAOMongo {

  async registerOrder(user_id, restaurant_id, menu_id, order_time, status) {
    try {
      const db = await dbPromise;
      const collection = db.collection('orders');
      const result = await collection.insertOne({
        user_id: new ObjectId(user_id),
        restaurant_id: new ObjectId(restaurant_id),
        menu_id: new ObjectId(menu_id),
        order_time: new Date(order_time),
        status,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      return await collection.findOne({ _id: result.insertedId });
    } catch (error) {
      console.error("Error al registrar pedido en MongoDB:", error);
      throw error;
    }
  }
  
  async getOrder(id) {
    try {
      const db = await dbPromise;
      const collection = db.collection('orders');
      const result = await collection.findOne(
        { _id: new ObjectId(id) },
        {
          projection: {
            user_id: 1,
            restaurant_id: 1,
            menu_id: 1,
            order_time: 1,
            status: 1
          }
        }
      );
      return result;
    } catch (error) {
      console.error("Error al obtener pedido en MongoDB:", error);
      throw error;
    }
  }
}

module.exports = OrderDAOMongo;
