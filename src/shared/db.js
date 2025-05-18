/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

require('dotenv').config({ path: __dirname + '/../.env' });

const dbType = process.env.DB_TYPE;

if (dbType === 'postgres') {
  const { Pool } = require('pg');

  console.log('🔹 DB_USER:', process.env.DB_USER);
  console.log('🔹 DB_NAME:', process.env.DB_NAME);
  console.log('🔹 DB_HOST:', process.env.DB_HOST);
  console.log('🔹 DB_PORT:', process.env.DB_PORT);

  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  // Test connection immediately
  (async () => {
    try {
      const res = await pool.query('SELECT NOW()');
      console.log('🔹 Conexión exitosa a PostgreSQL:', res.rows[0]);
    } catch (err) {
      console.error('Error al conectar a PostgreSQL:', err.message);
    }
  })();

  module.exports = pool;

} else if (dbType === 'mongo') {
  const { MongoClient } = require('mongodb');
  const uri = `mongodb://mongos:27017/${process.env.MONGO_INITDB_DATABASE}`;
  const client = new MongoClient(uri);

  // Test connection immediately
  (async () => {
    try {
      await client.connect();
      console.log('🔹 Conexión exitosa a MongoDB');
    } catch (err) {
      console.error('Error al conectar a MongoDB:', err.message);
    }
  })();

  // Export a promise that resolves to the db instance
  module.exports = client.connect().then(() => client.db(process.env.MONGO_INITDB_DATABASE));

} else {
  throw new Error(`${dbType} not supported`);
}