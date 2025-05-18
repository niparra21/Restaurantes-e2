/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

const { elasticClient } = require('./elasticsearchClient');                                         // import ElasticSearch client
const dbType = process.env.DB_TYPE;                                                                 // get db type from env variable

let productDAO;                                                                                     // declare productDAO variable
if (dbType === 'postgres') {                                                                        // if db type is postgres
  const ProductDAOPostgres = require('../DAOS/Postgres/ProductDAOPostgres');                        // import Postgres DAO
  productDAO = new ProductDAOPostgres();                                                            // and instantiate Postgres DAO
} else if (dbType === 'mongo') {                                                                    // if db type is mongo
  const ProductDAOMongo = require('../DAOS/Mongo/ProductDAOMongo');                                 // import Mongo DAO
  productDAO = new ProductDAOMongo();                                                               // and instantiate Mongo DAO
} else {                                                                                            // if db type is neither postgres nor mongo
  throw new Error('DB_TYPE not supported for reindexing');                                          // throw error
}

/* --------------------------------------------------------------------- */
// REINDEX PRODUCTS IN ELASTIC

/* NOTE
 * ElasticSearch is not a db replacement - it is a search index.
 * When reindexing, we are only adding documents in the index, but old documents may remain.
 * This old documents could be the ones from the other db.
 * So, to avoid seeing info from the other db, we clean up the index before reindexing.
 */

const reindexAllProducts = async () => {
  try {
    // 1. clean up the index
    await elasticClient.deleteByQuery({                                                             // delete all documents in index
      index: 'products',
      body: { query: { match_all: {} } }
    });

    // 2. reindex products from db
    console.log('🔸 Obteniendo productos de la base de datos...');                                  // log message
    const products = await productDAO.getProducts();                                                // get products from the db
    
    const body = products.flatMap(product => [                                                      // create body for bulk index request
      { index: { _index: 'products', _id: (product.id || product._id).toString() } },               // index and id for each product
      {
        name: product.name,                                                                         // product name
        description: product.description,                                                           // product description
        category: product.category,                                                                 // product category
        restaurant_id: (product.restaurant_id && product.restaurant_id.toString())                  // product restaurant id as string
      }
    ]);

    console.log('▫️  Indexando productos en ElasticSearch...');                                     // log message
    const response = await elasticClient.bulk({ refresh: true, body });                             // send bulk index request to ElasticSearch
    
    if (response.errors) {                                                                          // if there are errors in the response
      const erroredDocuments = [];                                                                  // create array to store errored documents
      response.items.forEach((action, i) => {                                                       // iterate over response items
        if (action.index.error) {                                                                   // if there is an error in the action
          erroredDocuments.push({                                                                   // add errored document to array
            id: body[i*2].index._id,                                                                // id of the errored document
            error: action.index.error                                                               // error message
          });
        }
      });
      console.error('▫️  Errores durante la reindexación:', erroredDocuments);                      // log error message
      throw new Error(`Errores en ${erroredDocuments.length} documentos`);                          // throw error
    }
    
    const message = `▫️  Reindexación completada. ${products.length} productos procesados.`;        // success message
    console.log(message);                                                                           // log success message
    return { success: true, message };                                                              // return success object
  } catch (error) {                                                                                 // catch any error
    console.error('▫️  Error en reindexación:', {                                                   // log error message
      message: error.message,
      elasticError: error.meta?.body?.error
    });
    throw error;
  }
};

module.exports = { reindexAllProducts };