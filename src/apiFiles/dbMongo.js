require('dotenv').config({ path: __dirname + '/../.env' });
const { MongoClient } = require('mongodb');

const uri = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:27017`;

const client = new MongoClient(uri);

const connectMongoDB = async () => {
    try {
        await client.connect();
        console.log('Conexión exitosa a MongoDB');
        return client.db(process.env.MONGO_INITDB_DATABASE);
    } catch (err) {
        console.error('Error al conectar a MongoDB:', err.message);
    }
};

module.exports = connectMongoDB;
