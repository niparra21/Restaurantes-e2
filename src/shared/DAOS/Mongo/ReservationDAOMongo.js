const { ObjectId } = require('mongodb');

class ReservationDAOMongo {
  constructor(db) {
    this.collection = db.collection('reservations');
  }
  
  async registerReservation(user_id, restaurant_id, reservation_time) {
    try {
      const result = await this.collection.insertOne({
        user_id: new ObjectId(user_id),
        restaurant_id: new ObjectId(restaurant_id),
        reservation_time: new Date(reservation_time),
        created_at: new Date(),
        updated_at: new Date()
      });
      
      return await this.collection.findOne({ _id: result.insertedId });
    } catch (error) {
      console.error("Error al registrar reserva en MongoDB:", error);
      throw error;
    }
  }

  async getReservation(reservationId) {
  try {
    return await this.collection.findOne(
      { _id: new ObjectId(reservationId) },
      { projection: {
        _id: 1,
        user_id: 1,
        reservation_time: 1,
        created_at: 1,
        updated_at: 1
      }}
    );
  } catch (error) {
    console.error("Error al obtener reservación (MongoDB):", error);
    throw error;
  }
}
  
  async deleteReservation(reservation_id) {
    try {
      const result = await this.collection.findOneAndDelete({ _id: new ObjectId(reservation_id) });
      
      if (result.deletedCount === 0) {
        throw new Error("Reserva no encontrada");
      }
      
      return result; 
    } catch (error) {
      console.error("Error al eliminar reserva en MongoDB:", error);
      throw error;
    }
  }
}

module.exports = ReservationDAOMongo;
