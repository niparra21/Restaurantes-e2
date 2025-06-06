const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

// Configura la conexión según tus variables reales
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Restaurante',
  password: 'mitzy',
  port: 5432,
});

async function insertFakeUsers(count = 20) {
  for (let i = 0; i < count; i++) {
    const username = faker.internet.username();
    const password = faker.internet.password();
    const email = faker.internet.email();
    const role = 'user';
    const keycloak_id = faker.string.uuid();

    try {
      await pool.query(
        `INSERT INTO users (username, password, email, role, keycloak_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [username, password, email, role, keycloak_id]
      );
      console.log(`Usuario ${username} insertado`);
    } catch (err) {
      console.error('Error insertando usuario:', err.message);
    }
  }
}

async function insertFakeRestaurants(count = 20) {
  const usersRes = await pool.query('SELECT id FROM users');
  const userIds = usersRes.rows.map(row => row.id);
  for (let i = 0; i < count; i++) {
    const name = faker.company.name();
    const address = faker.location.streetAddress()
    const city = faker.location.city()
    const phone = faker.phone.number();
    const owner_id = userIds[Math.floor(Math.random() * userIds.length)];

    try {
      await pool.query(
        `INSERT INTO restaurants (name, address, city, phone, owner_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, address, city, phone, owner_id]
      );
      console.log(`Restaurante ${name} insertado`);
    } catch (err) {
      console.error('Error insertando restaurante:', err.message);
    }
  }
}

async function insertStaticProducts() {
  const restaurantsRes = await pool.query('SELECT id FROM restaurants');
  const restaurantIds = restaurantsRes.rows.map(row => row.id);
  const products = [
    { name: 'Hamburguesa Clásica', description: 'Carne, queso, lechuga y tomate', price: 5.99, category: 'Comida rápida', restaurant_id: 1 },
    { name: 'Papas Fritas', description: 'Papas crujientes con sal', price: 2.49, category: 'Acompañamientos', restaurant_id: 17 },
    { name: 'Coca-Cola', description: 'Bebida gaseosa 355ml', price: 1.99, category: 'Bebidas', restaurant_id: 1 },
    { name: 'Pizza Margarita', description: 'Salsa de tomate, queso mozzarella y albahaca', price: 7.99, category: 'Italiana', restaurant_id: 2 },
    { name: 'Ensalada César', description: 'Lechuga romana, crutones, queso parmesano', price: 4.99, category: 'Ensaladas', restaurant_id: 2 },
    { name: 'Jugo Natural de Naranja', description: 'Exprimido al momento', price: 2.79, category: 'Bebidas', restaurant_id: 17 },
    { name: 'Taco al Pastor', description: 'Cerdo marinado, piña y cebolla', price: 3.99, category: 'Mexicana', restaurant_id: 3 },
    { name: 'Quesadilla de Pollo', description: 'Tortilla con queso y pollo', price: 4.49, category: 'Mexicana', restaurant_id: 13 },
    { name: 'Agua Mineral', description: 'Botella 500ml', price: 1.29, category: 'Bebidas', restaurant_id: 3 },
    { name: 'Sushi Roll', description: 'Arroz, alga, salmón y aguacate', price: 8.99, category: 'Japonesa', restaurant_id: 4 },
    { name: 'Tempura de Camarón', description: 'Camarones empanizados y fritos', price: 6.99, category: 'Japonesa', restaurant_id: 4 },
    { name: 'Ramen', description: 'Sopa de fideos con cerdo y huevo', price: 7.49, category: 'Japonesa', restaurant_id: 4 },
    { name: 'Pollo a la Parrilla', description: 'Pechuga de pollo asada', price: 5.49, category: 'Parrilla', restaurant_id: 15 },
    { name: 'Costillas BBQ', description: 'Costillas de cerdo con salsa BBQ', price: 9.99, category: 'Parrilla', restaurant_id: 5 },
    { name: 'Ensalada Mixta', description: 'Lechuga, tomate, zanahoria y pepino', price: 3.99, category: 'Ensaladas', restaurant_id: 5 },
    { name: 'Spaghetti Boloñesa', description: 'Pasta con salsa de carne', price: 6.99, category: 'Italiana', restaurant_id: 20 },
    { name: 'Lasaña', description: 'Capas de pasta, carne y queso', price: 7.99, category: 'Italiana', restaurant_id: 2 },
    { name: 'Pan de Ajo', description: 'Pan horneado con ajo y mantequilla', price: 2.49, category: 'Acompañamientos', restaurant_id: 2 },
    { name: 'Nachos con Queso', description: 'Totopos con queso fundido', price: 3.99, category: 'Mexicana', restaurant_id: 23 },
    { name: 'Guacamole', description: 'Aguacate, tomate, cebolla y limón', price: 2.99, category: 'Mexicana', restaurant_id: 13 },
    { name: 'Agua de Horchata', description: 'Bebida de arroz y canela', price: 1.99, category: 'Bebidas', restaurant_id: 3 },
    { name: 'Café Americano', description: 'Café negro', price: 1.49, category: 'Bebidas', restaurant_id: 1 },
    { name: 'Té Helado', description: 'Té frío con limón', price: 1.79, category: 'Bebidas', restaurant_id: 1 },
    { name: 'Brownie', description: 'Pastel de chocolate', price: 2.99, category: 'Postres', restaurant_id: 1 },
    { name: 'Helado de Vainilla', description: 'Helado cremoso de vainilla', price: 2.49, category: 'Postres', restaurant_id: 2 },
    { name: 'Flan', description: 'Postre de huevo y caramelo', price: 2.99, category: 'Postres', restaurant_id: 2 },
    { name: 'Sopa Azteca', description: 'Sopa de tortilla con chile y queso', price: 4.99, category: 'Mexicana', restaurant_id: 3 },
    { name: 'Tostadas de Pollo', description: 'Tortilla crujiente con pollo y verduras', price: 3.99, category: 'Mexicana', restaurant_id: 3 },
    { name: 'Croissant', description: 'Pan francés hojaldrado', price: 2.29, category: 'Panadería', restaurant_id: 9 },
    { name: 'Bagel', description: 'Pan redondo con semillas', price: 2.19, category: 'Panadería', restaurant_id: 4 },
    { name: 'Jugo de Manzana', description: 'Bebida natural de manzana', price: 2.49, category: 'Bebidas', restaurant_id: 9 },
    { name: 'Sándwich de Jamón', description: 'Pan, jamón, queso y lechuga', price: 3.49, category: 'Comida rápida', restaurant_id: 1 },
    { name: 'Hot Dog', description: 'Pan, salchicha y aderezos', price: 2.99, category: 'Comida rápida', restaurant_id: 1 },
    { name: 'Empanada de Pollo', description: 'Masa rellena de pollo', price: 2.79, category: 'Panadería', restaurant_id: 5 },
    { name: 'Muffin de Arándanos', description: 'Panquecillo con arándanos', price: 2.59, category: 'Postres', restaurant_id: 5 },
    { name: 'Ensalada de Frutas', description: 'Frutas frescas de temporada', price: 3.49, category: 'Ensaladas', restaurant_id: 5 },
    { name: 'Sopa de Pollo', description: 'Caldo con pollo y verduras', price: 4.49, category: 'Sopas', restaurant_id: 5 },
    { name: 'Té Verde', description: 'Bebida caliente de té verde', price: 1.69, category: 'Bebidas', restaurant_id: 15 },
    { name: 'Smoothie de Fresa', description: 'Batido de fresa y yogur', price: 3.29, category: 'Bebidas', restaurant_id: 5 },
    { name: 'Pizza Pepperoni', description: 'Pizza con pepperoni y queso', price: 8.49, category: 'Italiana', restaurant_id: 2 },
    { name: 'Sopa Miso', description: 'Sopa japonesa de miso y tofu', price: 3.99, category: 'Japonesa', restaurant_id: 14 }
  ];

  for (const p of products) {
    const restaurant_id = restaurantIds[Math.floor(Math.random() * restaurantIds.length)];
    try {
      await pool.query(
        `INSERT INTO products (name, description, price, category, restaurant_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [p.name, p.description, p.price, p.category, restaurant_id]
      );
      console.log(`Producto '${p.name}' insertado`);
    } catch (err) {
      console.error('Error insertando producto:', err.message);
    }
  }
}

async function insertFakeMenus(count = 20) {
  const restaurantsRes = await pool.query('SELECT id FROM restaurants');
  const restaurantIds = restaurantsRes.rows.map(row => row.id);
  for (let i = 0; i < count; i++) {
    const restaurant_id = restaurantIds[Math.floor(Math.random() * restaurantIds.length)];
    const name = faker.food.dish();
    const description = faker.food.description();

    try {
      await pool.query(
        `INSERT INTO menus (restaurant_id, name, description)
         VALUES ($1, $2, $3)`,
        [restaurant_id, name, description]
      );
      console.log(`Menú '${name}' insertado para el restaurante ID ${restaurant_id}`);
    } catch (err) {
      console.error('Error insertando menú:', err.message);
    }
  }
}

async function insertFakeMenuItems(count = 20) {
  // IDs existentes de menus y products
  const menusRes = await pool.query('SELECT id FROM menus');
  const productsRes = await pool.query('SELECT id FROM products');
  const menuIds = menusRes.rows.map(row => row.id);
  const productIds = productsRes.rows.map(row => row.id);

  if (menuIds.length === 0 || productIds.length === 0) {
    console.log('No hay menus o productos para asignar a menu_items.');
    return;
  }

  for (let i = 0; i < count; i++) {
    const menu_id = menuIds[Math.floor(Math.random() * menuIds.length)];
    const product_id = productIds[Math.floor(Math.random() * productIds.length)];
    const quantity = faker.number.int({ min: 1, max: 3 })

    try {
      await pool.query(
        `INSERT INTO menu_items (menu_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [menu_id, product_id, quantity]
      );
      console.log(`MenuItem agregado: menu_id=${menu_id}, product_id=${product_id}, quantity=${quantity}`);
    } catch (err) {
      console.error('Error insertando menu_item:', err.message);
    }
  }
}

async function insertFakeReservations(count = 20) {
  const usersRes = await pool.query('SELECT id FROM users');
  const userIds = usersRes.rows.map(row => row.id);
  const restaurantsRes = await pool.query('SELECT id FROM restaurants');
  const restaurantIds = restaurantsRes.rows.map(row => row.id);
  for (let i = 0; i < count; i++) {
    const user_id = userIds[Math.floor(Math.random() * userIds.length)];
    const restaurant_id = restaurantIds[Math.floor(Math.random() * restaurantIds.length)];
    const reservation_time = faker.date.recent();

    try {
      await pool.query(
        `INSERT INTO reservations (user_id, restaurant_id, reservation_time)
         VALUES ($1, $2, $3)`,
        [user_id, restaurant_id, reservation_time]
      );
      console.log(`Reservation creada para usuario ID ${user_id} en restaurante ID ${restaurant_id}`);
    } catch (err) {
      console.error('Error insertando orden:', err.message);
    }
  }
}

async function insertaFakeOrders(count = 20) {
  const usersRes = await pool.query('SELECT id FROM users');
  const userIds = usersRes.rows.map(row => row.id);
  const restaurantsRes = await pool.query('SELECT id FROM restaurants');
  const restaurantIds = restaurantsRes.rows.map(row => row.id);
  const menusRes = await pool.query('SELECT id FROM menus');
  const menuIds = menusRes.rows.map(row => row.id);
  for (let i = 0; i < count; i++) {
    const user_id = userIds[Math.floor(Math.random() * userIds.length)];
    const restaurant_id = restaurantIds[Math.floor(Math.random() * restaurantIds.length)];
    const menu_id = menuIds[Math.floor(Math.random() * menuIds.length)];
    const order_time = faker.date.recent();
    const status = 'pending';

    try {
      await pool.query(
        `INSERT INTO orders (user_id, restaurant_id, menu_id, order_time, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [user_id, restaurant_id, menu_id, order_time, status]
      );
      console.log(`Orden creada para usuario ID ${user_id} en restaurante ID ${restaurant_id}`);
    } catch (err) {
      console.error('Error insertando orden:', err.message);
    }
  }
}

async function main() {
  try {
    await insertFakeUsers(20);
    await insertFakeRestaurants(20);
    await insertStaticProducts();
    await insertFakeMenus(20);
    await insertFakeMenuItems(20);
    await insertFakeReservations(20);
    await insertaFakeOrders(20);
    console.log('¡Datos insertados correctamente!');
  } catch (err) {
    console.error('Error general en la inserción:', err.message);
  } finally {
    await pool.end();
  }
}

main();
