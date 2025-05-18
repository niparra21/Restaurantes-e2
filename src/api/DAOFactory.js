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
const ProductDAOMongo = require('./shared/DAOS/Mongo/ProductDAOMongo');
const ReservationDAOMongo = require('./shared/DAOS/Mongo/ReservationDAOMongo');

function DAOFactory(dbType) {
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
      userDAO: new UserDAOMongo(),
      restaurantDAO: new RestaurantDAOMongo(),
      menuDAO: new MenuDAOMongo(),
      orderDAO: new OrderDAOMongo(),
      productDAO: new ProductDAOMongo(),
      reservationDAO: new ReservationDAOMongo(),
    };
  }
  
  throw new Error(`Tipo de base de datos no soportado: ${dbType}`);
}

module.exports = DAOFactory;
