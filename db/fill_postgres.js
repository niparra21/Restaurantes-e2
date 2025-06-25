const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

// Configuración de conexión para Docker
const pool = new Pool({
  user: 'postgres',
  host: 'db', // Nombre del servicio en docker-compose
  database: 'Restaurante',
  password: 'mitzy',
  port: 5432,
  connectionTimeoutMillis: 5000, // Tiempo de espera para conexión
});

// Función para esperar que PostgreSQL esté listo
async function waitForPostgres() {
  console.log('Esperando que PostgreSQL esté listo...');
  let attempts = 0;
while (true) {
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL está listo');
    return;
  } catch (err) {
    attempts++;
    const waitTime = Math.min(attempts * 1000, 10000); // máximo 10 segundos de espera entre intentos
    console.log(`⚠️ Intento ${attempts} - PostgreSQL no está listo, reintentando en ${waitTime / 1000} segundos...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

  
  throw new Error('No se pudo conectar a PostgreSQL después de varios intentos');
}

// Función para crear las tablas si no existen
async function createTables() {
  try {
    console.log('Creando tablas si no existen...');
    
    // Crear tipo ORDER_STATUS si no existe
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
          CREATE TYPE ORDER_STATUS AS ENUM (
            'pending',
            'confirmed',
            'preparing',
            'ready',
            'delivered',
            'cancelled'
          );
        END IF;
      END$$;
    `);

    // Crear tablas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        keycloak_id VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS restaurants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        phone VARCHAR(255),
        owner_id INT REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS menus (
        id SERIAL PRIMARY KEY,
        restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
        reservation_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
        menu_id INT REFERENCES menus(id) ON DELETE CASCADE,
        order_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ORDER_STATUS NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(50) NOT NULL,
        restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        menu_id INT REFERENCES menus(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id),
        quantity INT DEFAULT 1
      );
    `);

    // Crear vista
    await pool.query(`
      CREATE OR REPLACE VIEW order_revenue AS
      SELECT 
        o.id AS order_id,
        o.order_time,
        o.status,
        p.name AS product_name,
        p.category,
        p.price,
        mi.quantity,
        (p.price * mi.quantity) AS line_total
      FROM orders o
      JOIN menu_items mi ON o.menu_id = mi.menu_id
      JOIN products p ON mi.product_id = p.id
      WHERE o.status IN ('delivered', 'cancelled');
    `);

    console.log('✅ Tablas y vistas creadas correctamente');
  } catch (err) {
    console.error('❌ Error creando tablas:', err.message);
    throw err;
  }
}

async function insertFakeUsers(count = 20) {
  console.log(`Insertando ${count} usuarios...`);
  for (let i = 0; i < count; i++) {
    const username = faker.internet.userName();
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
      console.log(`✅ Usuario ${username} insertado`);
    } catch (err) {
      console.error('❌ Error insertando usuario:', err.message);
    }
  }
}

async function insertFakeRestaurants(count = 20) {
  console.log(`Insertando ${count} restaurantes...`);
  const usersRes = await pool.query('SELECT id FROM users');
  
  if (usersRes.rows.length === 0) {
    console.error('❌ No hay usuarios disponibles para asignar como dueños');
    return;
  }
  
  const userIds = usersRes.rows.map(row => row.id);
  
  for (let i = 0; i < count; i++) {
    const name = faker.company.name();
    const address = faker.location.streetAddress();
    const city = faker.location.city();
    const phone = faker.phone.number();
    const owner_id = userIds[Math.floor(Math.random() * userIds.length)];

    try {
      await pool.query(
        `INSERT INTO restaurants (name, address, city, phone, owner_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, address, city, phone, owner_id]
      );
      console.log(`✅ Restaurante "${name}" insertado en ${city}`);
    } catch (err) {
      console.error('❌ Error insertando restaurante:', err.message);
    }
  }
}

async function insertStaticProducts() {
  console.log('Insertando productos estáticos...');
  const restaurantsRes = await pool.query('SELECT id FROM restaurants');
  
  if (restaurantsRes.rows.length === 0) {
    console.error('❌ No hay restaurantes disponibles para asignar productos');
    return;
  }
  
  const restaurantIds = restaurantsRes.rows.map(row => row.id);
  
  // Lista de productos sin restaurant_id fijo
  const products = [
    { name: 'Hamburguesa Clásica', description: 'Carne, queso, lechuga y tomate', price: 5.99, category: 'Comida rápida' },
    { name: 'Papas Fritas', description: 'Papas crujientes con sal', price: 2.49, category: 'Acompañamientos' },
    { name: 'Coca-Cola', description: 'Bebida gaseosa 355ml', price: 1.99, category: 'Bebidas' },
    { name: 'Pizza Margarita', description: 'Salsa de tomate, queso mozzarella y albahaca', price: 7.99, category: 'Italiana' },
    { name: 'Ensalada César', description: 'Lechuga romana, crutones, queso parmesano', price: 4.99, category: 'Ensaladas' },
    { name: 'Jugo Natural de Naranja', description: 'Exprimido al momento', price: 2.79, category: 'Bebidas' },
    { name: 'Taco al Pastor', description: 'Cerdo marinado, piña y cebolla', price: 3.99, category: 'Mexicana' },
    { name: 'Quesadilla de Pollo', description: 'Tortilla con queso y pollo', price: 4.49, category: 'Mexicana' },
    { name: 'Agua Mineral', description: 'Botella 500ml', price: 1.29, category: 'Bebidas' },
    { name: 'Sushi Roll', description: 'Arroz, alga, salmón y aguacate', price: 8.99, category: 'Japonesa' },
    { name: 'Tempura de Camarón', description: 'Camarones empanizados y fritos', price: 6.99, category: 'Japonesa' },
    { name: 'Ramen', description: 'Sopa de fideos con cerdo y huevo', price: 7.49, category: 'Japonesa' },
    { name: 'Pollo a la Parrilla', description: 'Pechuga de pollo asada', price: 5.49, category: 'Parrilla' },
    { name: 'Costillas BBQ', description: 'Costillas de cerdo con salsa BBQ', price: 9.99, category: 'Parrilla' },
    { name: 'Ensalada Mixta', description: 'Lechuga, tomate, zanahoria y pepino', price: 3.99, category: 'Ensaladas' },
    { name: 'Spaghetti Boloñesa', description: 'Pasta con salsa de carne', price: 6.99, category: 'Italiana' },
    { name: 'Lasaña', description: 'Capas de pasta, carne y queso', price: 7.99, category: 'Italiana' },
    { name: 'Pan de Ajo', description: 'Pan horneado con ajo y mantequilla', price: 2.49, category: 'Acompañamientos' },
    { name: 'Nachos con Queso', description: 'Totopos con queso fundido', price: 3.99, category: 'Mexicana' },
    { name: 'Guacamole', description: 'Aguacate, tomate, cebolla y limón', price: 2.99, category: 'Mexicana' },
    { name: 'Agua de Horchata', description: 'Bebida de arroz y canela', price: 1.99, category: 'Bebidas' },
    { name: 'Café Americano', description: 'Café negro', price: 1.49, category: 'Bebidas' },
    { name: 'Té Helado', description: 'Té frío con limón', price: 1.79, category: 'Bebidas' },
    { name: 'Brownie', description: 'Pastel de chocolate', price: 2.99, category: 'Postres' },
    { name: 'Helado de Vainilla', description: 'Helado cremoso de vainilla', price: 2.49, category: 'Postres' },
    { name: 'Flan', description: 'Postre de huevo y caramelo', price: 2.99, category: 'Postres' },
    { name: 'Sopa Azteca', description: 'Sopa de tortilla con chile y queso', price: 4.99, category: 'Mexicana' },
    { name: 'Tostadas de Pollo', description: 'Tortilla crujiente con pollo y verduras', price: 3.99, category: 'Mexicana' },
    { name: 'Croissant', description: 'Pan francés hojaldrado', price: 2.29, category: 'Panadería' },
    { name: 'Bagel', description: 'Pan redondo con semillas', price: 2.19, category: 'Panadería' },
    { name: 'Jugo de Manzana', description: 'Bebida natural de manzana', price: 2.49, category: 'Bebidas' },
    { name: 'Sándwich de Jamón', description: 'Pan, jamón, queso y lechuga', price: 3.49, category: 'Comida rápida' },
    { name: 'Hot Dog', description: 'Pan, salchicha y aderezos', price: 2.99, category: 'Comida rápida' },
    { name: 'Empanada de Pollo', description: 'Masa rellena de pollo', price: 2.79, category: 'Panadería' },
    { name: 'Muffin de Arándanos', description: 'Panquecillo con arándanos', price: 2.59, category: 'Postres' },
    { name: 'Ensalada de Frutas', description: 'Frutas frescas de temporada', price: 3.49, category: 'Ensaladas' },
    { name: 'Sopa de Pollo', description: 'Caldo con pollo y verduras', price: 4.49, category: 'Sopas' },
    { name: 'Té Verde', description: 'Bebida caliente de té verde', price: 1.69, category: 'Bebidas' },
    { name: 'Smoothie de Fresa', description: 'Batido de fresa y yogur', price: 3.29, category: 'Bebidas' },
    { name: 'Pizza Pepperoni', description: 'Pizza con pepperoni y queso', price: 8.49, category: 'Italiana' },
    { name: 'Sopa Miso', description: 'Sopa japonesa de miso y tofu', price: 3.99, category: 'Japonesa' }
  ];

  for (const p of products) {
    const restaurant_id = restaurantIds[Math.floor(Math.random() * restaurantIds.length)];
    try {
      await pool.query(
        `INSERT INTO products (name, description, price, category, restaurant_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [p.name, p.description, p.price, p.category, restaurant_id]
      );
      console.log(`✅ Producto '${p.name}' insertado en restaurante ${restaurant_id}`);
    } catch (err) {
      console.error('❌ Error insertando producto:', err.message);
    }
  }
}

async function insertFakeMenus(count = 20) {
  console.log(`Insertando ${count} menús...`);
  const restaurantsRes = await pool.query('SELECT id FROM restaurants');
  
  if (restaurantsRes.rows.length === 0) {
    console.error('❌ No hay restaurantes disponibles para asignar menús');
    return;
  }
  
  const restaurantIds = restaurantsRes.rows.map(row => row.id);
  
  for (let i = 0; i < count; i++) {
    const restaurant_id = restaurantIds[Math.floor(Math.random() * restaurantIds.length)];
    const name = faker.commerce.productName();
    const description = faker.commerce.productDescription();

    try {
      await pool.query(
        `INSERT INTO menus (restaurant_id, name, description)
         VALUES ($1, $2, $3)`,
        [restaurant_id, name, description]
      );
      console.log(`✅ Menú '${name}' insertado para restaurante ID ${restaurant_id}`);
    } catch (err) {
      console.error('❌ Error insertando menú:', err.message);
    }
  }
}

async function insertFakeMenuItems(count = 20) {
  console.log(`Insertando ${count} ítems de menú...`);
  const menusRes = await pool.query('SELECT id FROM menus');
  const productsRes = await pool.query('SELECT id FROM products');
  
  if (menusRes.rows.length === 0 || productsRes.rows.length === 0) {
    console.error('❌ No hay menús o productos para asignar ítems');
    return;
  }
  
  const menuIds = menusRes.rows.map(row => row.id);
  const productIds = productsRes.rows.map(row => row.id);

  for (let i = 0; i < count; i++) {
    const menu_id = menuIds[Math.floor(Math.random() * menuIds.length)];
    const product_id = productIds[Math.floor(Math.random() * productIds.length)];
    const quantity = faker.number.int({ min: 1, max: 3 });

    try {
      await pool.query(
        `INSERT INTO menu_items (menu_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [menu_id, product_id, quantity]
      );
      console.log(`✅ MenuItem agregado: menu_id=${menu_id}, product_id=${product_id}, quantity=${quantity}`);
    } catch (err) {
      console.error('❌ Error insertando menu_item:', err.message);
    }
  }
}

async function insertFakeReservations(count = 20) {
  console.log(`Insertando ${count} reservaciones...`);
  const usersRes = await pool.query('SELECT id FROM users');
  const restaurantsRes = await pool.query('SELECT id FROM restaurants');
  
  if (usersRes.rows.length === 0 || restaurantsRes.rows.length === 0) {
    console.error('❌ No hay usuarios o restaurantes para asignar reservaciones');
    return;
  }
  
  const userIds = usersRes.rows.map(row => row.id);
  const restaurantIds = restaurantsRes.rows.map(row => row.id);
  
  for (let i = 0; i < count; i++) {
    const user_id = userIds[Math.floor(Math.random() * userIds.length)];
    const restaurant_id = restaurantIds[Math.floor(Math.random() * restaurantIds.length)];
    const reservation_time = faker.date.future();

    try {
      await pool.query(
        `INSERT INTO reservations (user_id, restaurant_id, reservation_time)
         VALUES ($1, $2, $3)`,
        [user_id, restaurant_id, reservation_time]
      );
      console.log(`✅ Reservación creada para usuario ID ${user_id} en restaurante ID ${restaurant_id}`);
    } catch (err) {
      console.error('❌ Error insertando reservación:', err.message);
    }
  }
}

async function insertFakeOrders(count = 20) {
  console.log(`Insertando ${count} órdenes...`);
  const usersRes = await pool.query('SELECT id FROM users');
  const restaurantsRes = await pool.query('SELECT id FROM restaurants');
  const menusRes = await pool.query('SELECT id FROM menus');
  
  if (usersRes.rows.length === 0 || restaurantsRes.rows.length === 0 || menusRes.rows.length === 0) {
    console.error('❌ Faltan datos para crear órdenes');
    return;
  }
  
  const userIds = usersRes.rows.map(row => row.id);
  const restaurantIds = restaurantsRes.rows.map(row => row.id);
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
      console.log(`✅ Orden creada para usuario ID ${user_id} en restaurante ID ${restaurant_id}`);
    } catch (err) {
      console.error('❌ Error insertando orden:', err.message);
    }
  }
}

async function main() {
  try {
    // Esperar que PostgreSQL esté listo
    await waitForPostgres();
    
    // Crear tablas si no existen
    await createTables();
    
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM reservations');
    await pool.query('DELETE FROM menu_items');
    await pool.query('DELETE FROM menus');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM restaurants');
    await pool.query('DELETE FROM users');


    // Insertar datos
    await insertFakeUsers(20);
    await insertFakeRestaurants(20);
    await insertStaticProducts();
    await insertFakeMenus(20);
    await insertFakeMenuItems(20);
    await insertFakeReservations(20);
    await insertFakeOrders(20);
    
    console.log('🎉 ¡Datos insertados correctamente!');
  } catch (err) {
    console.error('🔥 Error general en la inserción:', err.message);
  } finally {
    await pool.end();
    console.log('🔌 Conexión a PostgreSQL cerrada');
  }
}

main();