/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

const express = require("express");
const cors = require("cors");
const { initElasticSearch } = require('./shared/elastic/elasticsearchClient');
const { reindexAllProducts } = require('./shared/elastic/reindexProducts');
const routes = require("./Routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/search", routes);

const PORT = process.env.SEARCH_PORT || 5001;

const startServer = async () => {
  try {
    console.log('🔍 Conectando a ElasticSearch...');
    await initElasticSearch();
    
    if (process.env.REINDEX_ON_START === 'true') {
      console.log('🔍 Reindexando productos...');
      await reindexAllProducts();
    }

    app.listen(PORT, () => {
      console.log(`🔍 Servicio de búsqueda corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('🔍 Error iniciando servicio de búsqueda:', error.message);
    process.exit(1);
  }
};

startServer();