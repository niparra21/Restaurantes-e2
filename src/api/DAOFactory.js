/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

const UserDAOPostgres = require('./DAOS/Postgres/UserDAOPostgres');
const RestaurantDAOPostgres = require('./DAOS/Postgres/RestaurantDAOPostgres');
const MenuDAOPostgres = require('./DAOS/Postgres/MenuDAOPostgres');
const OrderDAOPostgres = require('./DAOS/Postgres/OrderDAOPostgres');
const ProductDAOPostgres = require('./DAOS/Postgres/ProductDAOPostgres');
const ReservationDAOPostgres = require('./DAOS/Postgres/ReservationDAOPostgres');

const UserDAOMongo = require('./DAOS/Mongo/UserDAOMongo');
const RestaurantDAOMongo = require('./DAOS/Mongo/RestaurantDAOMongo');
const MenuDAOMongo = require('./DAOS/Mongo/MenuDAOMongo');
const OrderDAOMongo = require('./DAOS/Mongo/OrderDAOMongo');
const ReservationDAOMongo = require('./DAOS/Mongo/ReservationDAOMongo');

function DAOFactory(dbType, dbInstance) {
  if (dbType === 'postgres') {
    return {
      userDAO: new UserDAOPostgres(),
      restaurantDAO: new RestaurantDAOPostgres(),
      menuDAO: new MenuDAOPostgres(),
      orderDAO: new OrderDAOPostgres(),
      productDAO: new ProductDAOPostgres(),
      reservationDAO: new ReservationDAOPostgres(),
    };
  }
  
  if (dbType === 'mongo') {
    return {
      userDAO: new UserDAOMongo(dbInstance),
      restaurantDAO: new RestaurantDAOMongo(dbInstance),
      menuDAO: new MenuDAOMongo(dbInstance),
      orderDAO: new OrderDAOMongo(dbInstance),
      reservationDAO: new ReservationDAOMongo(dbInstance),
    };
  }
  
  throw new Error(`Tipo de base de datos no soportado: ${dbType}`);
}

module.exports = DAOFactory;
