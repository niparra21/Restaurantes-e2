require('dotenv').config({ path: __dirname + '/../.env' });
const { MongoClient } = require('mongodb');

// Conexión al router mongos
const uri = `mongodb://${process.env.MONGO_HOST}:27017/${process.env.MONGO_INITDB_DATABASE}`;

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true, // Maneja automáticamente la replicación y el sharding
});

const connectMongoDB = async () => {
    try {
        await client.connect();
        console.log('Conexión exitosa a MongoDB');
        return client.db(process.env.MONGO_INITDB_DATABASE);
    } catch (err) {
        console.error('Error al conectar a MongoDB:', err.message);
        throw err;
    }
};

module.exports = connectMongoDB;