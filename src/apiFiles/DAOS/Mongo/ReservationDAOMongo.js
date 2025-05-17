/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

/*
This code is a MongoDB Data Access Object (DAO) for managing reservations in a restaurant application.
It provides methods to register, retrieve, and delete reservations from the MongoDB database.
*/ 

const { ObjectId } = require('mongodb');

class ReservationDAOMongo {
  constructor(db) {
    this.collection = db.collection('reservations');
  }

  async registerReservation(user_id, restaurant_id, reservation_time) {
    try {
      const _id = new ObjectId();
      const doc = {
        _id,
        reservation_id: _id, // Incluye la shard key desde el inicio
        user_id: new ObjectId(user_id),
        restaurant_id: new ObjectId(restaurant_id),
        reservation_time: new Date(reservation_time),
        created_at: new Date(),
        updated_at: new Date()
      };
      await this.collection.insertOne(doc);
      return await this.collection.findOne({ _id });
    } catch (error) {
      console.error("Error al registrar reserva en MongoDB:", error);
      throw error;
    }
  }

  async getReservation(reservationId) {
    try {
      return await this.collection.findOne(
        { reservation_id: new ObjectId(reservationId) },
        {
          projection: {
            _id: 1,
            reservation_id: 1,
            user_id: 1,
            restaurant_id: 1,
            reservation_time: 1,
            created_at: 1,
            updated_at: 1
          }
        }
      );
    } catch (error) {
      console.error("Error al obtener reservación (MongoDB):", error);
      throw error;
    }
  }

  async deleteReservation(reservationId) {
    try {
      const result = await this.collection.deleteOne({ reservation_id: new ObjectId(reservationId) });
      if (result.deletedCount === 0) {
        throw new Error("Reserva no encontrada");
      }
      return { reservation_id: reservationId };
    } catch (error) {
      console.error("Error al eliminar reserva en MongoDB:", error);
      throw error;
    }
  }
}

module.exports = ReservationDAOMongo;
