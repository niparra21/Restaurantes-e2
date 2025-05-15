const express = require("express");
const cors = require("cors");
const session = require("express-session");
const routes = require("./src/apiFiles/Routes");
const { keycloak, memoryStore } = require("./src/apiFiles/keycloak");
require("dotenv").config();

const { initElasticSearch } = require('./elastic-search/elasticsearchClient')
const { reindexAllProducts } = require('./elastic-search/reindexProducts');

const app = express();

app.use(cors());
app.use(express.json());

//sesión para Keycloak
app.use(session({
    secret: "some-secret", 
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));

app.use(keycloak.middleware()); 

app.use("/api", routes);

app.get("/", (req, res) => {
    res.send("API funcionando correctamente!");
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Print connection information for debugging
    console.log('🔹 Elasticsearch URL:', process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200');
    
    // 1. initialize Elastic
    console.log('🔸 Inicializando ElasticSearch...');
    await initElasticSearch();
    console.log('🔸 ElasticSearch inicializado correctamente');

    // 2. reindex all products
    if (process.env.REINDEX_ON_START === 'true') {
      console.log('🔸 Iniciando reindexación de productos...');
      const result = await reindexAllProducts();
      console.log(result.message || '🔸 Reindexación de productos finalizada');
    }

    // 3. start server
    app.listen(PORT, () => {
      console.log(`🔸 Servidor corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('🔸 Error durante la inicialización:', error.message);
    // Don't exit immediately for non-critical errors
    if (error.message.includes('No se pudo conectar a ElasticSearch')) {
      console.warn('🔸 Advertencia: La aplicación continuará sin ElasticSearch');
      
      // Start the server anyway
      app.listen(PORT, () => {
        console.log(`🔸 Servidor corriendo en puerto ${PORT} (sin ElasticSearch)`);
      });
    } else {
      process.exit(1);
    }
  }
};

startServer();