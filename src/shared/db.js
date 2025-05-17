/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

require('dotenv').config({ path: __dirname + '/../.env' });

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

const testDBConnection = async () => {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('Conexión exitosa a PostgreSQL:', res.rows[0]);
    } catch (err) {
        console.error('Error al conectar a PostgreSQL:', err.message);
    }
};

testDBConnection();

module.exports = pool;
