/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

/*
This code is a MongoDB Data Access Object (DAO) for managing reservations in a restaurant application.
It provides methods to register, retrieve, and delete reservations from the postgres database.
*/ 

const pool = require('../../db'); 

class ReservationDAOPostgres {
  
  async registerReservation(user_id, restaurant_id, reservation_time){
    try {
      const result = await pool.query(
        `INSERT INTO reservations (user_id, restaurant_id, reservation_time, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
        [user_id, restaurant_id, reservation_time]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error al registrar reserva:", error);
      throw error;
    }
  }

  async getReservation(reservationId) {
    try {
      const result = await pool.query(
        'SELECT id, user_id, reservation_time, created_at, updated_at FROM reservations WHERE id = $1',
        [reservationId]
      );
      return result.rows;
    } catch (error) {
      console.error("Error al obtener la reservación:", error);
      throw error;
    }
  }
  
  async deleteReservation(reservation_id) {
    try {
      const result = await pool.query(
        `DELETE FROM reservations WHERE id = $1 RETURNING *`,
        [reservation_id]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error al eliminar reserva:", error);
      throw error;
    }
  }
  
}

module.exports = ReservationDAOPostgres;