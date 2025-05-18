const { ObjectId } = require('mongodb');

class OrderDAOMongo {
  constructor(db) {
    this.collection = db.collection('orders');
  }
  
  async registerOrder(user_id, restaurant_id, menu_id, order_time, status) {
    try {
      const result = await this.collection.insertOne({
        user_id: new ObjectId(user_id),
        restaurant_id: new ObjectId(restaurant_id),
        menu_id: new ObjectId(menu_id),
        order_time: new Date(order_time),
        status,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      return await this.collection.findOne({ _id: result.insertedId });
    } catch (error) {
      console.error("Error al registrar pedido en MongoDB:", error);
      throw error;
    }
  }
  
  async getOrder(id) {
    try {
      const result = await this.collection.findOne(
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
