/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

const UserDAOPostgres = require('./shared/DAOS/Postgres/UserDAOPostgres');
const RestaurantDAOPostgres = require('./shared/DAOS/Postgres/RestaurantDAOPostgres');
const MenuDAOPostgres = require('./shared/DAOS/Postgres/MenuDAOPostgres');
const OrderDAOPostgres = require('./shared/DAOS/Postgres/OrderDAOPostgres');
const ProductDAOPostgres = require('./shared/DAOS/Postgres/ProductDAOPostgres');
const ReservationDAOPostgres = require('./shared/DAOS/Postgres/ReservationDAOPostgres');

const UserDAOMongo = require('./shared/DAOS/Mongo/UserDAOMongo');
const RestaurantDAOMongo = require('./shared/DAOS/Mongo/RestaurantDAOMongo');
const MenuDAOMongo = require('./shared/DAOS/Mongo/MenuDAOMongo');
const OrderDAOMongo = require('./shared/DAOS/Mongo/OrderDAOMongo');
const ReservationDAOMongo = require('./shared/DAOS/Mongo/ReservationDAOMongo');

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
