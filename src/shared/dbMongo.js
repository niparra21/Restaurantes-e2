/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const { MongoClient } = require('mongodb');

const uri = `mongodb://mongos:27017/${process.env.MONGO_INITDB_DATABASE}`;
const client = new MongoClient(uri);

const connectMongoDB = async (retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await client.connect();
            console.log('Conexión exitosa a MongoDB');
            return client.db(process.env.MONGO_INITDB_DATABASE);
        } catch (err) {
            console.error(`Error al conectar a MongoDB (intento ${i + 1}):`, err.message);
            if (i < retries - 1) {
                console.log(`Reintentando en ${delay / 1000} segundos...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw err;
            }
        }
    }
};

module.exports = connectMongoDB;