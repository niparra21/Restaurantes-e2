const { elasticClient } = require('./elasticsearchClient');
const ProductDAOPostgres = require('../src/apiFiles/DAOS/Postgres/ProductDAOPostgres');

const productDAO = new ProductDAOPostgres();

const reindexAllProducts = async () => {
  try {
    console.log('🔸 Obteniendo productos de la base de datos...');
    const products = await productDAO.getProducts();
    
    const body = products.flatMap(product => [
      { index: { _index: 'products', _id: product.id.toString() } },
      {
        name: product.name,
        description: product.description || 'Producto sin descripción',
        category: product.category,
        restaurant_id: product.restaurant_id.toString(),
        db_id: product.id.toString()
      }
    ]);

    console.log('🔸 Indexando productos en ElasticSearch...');
    const response = await elasticClient.bulk({ refresh: true, body });
    
    // Updated error handling for new client version
    if (response.errors) {
      const erroredDocuments = [];
      response.items.forEach((action, i) => {
        if (action.index.error) {
          erroredDocuments.push({
            id: body[i*2].index._id,
            error: action.index.error
          });
        }
      });
      console.error('🔸 Errores durante la reindexación:', erroredDocuments);
      throw new Error(`Errores en ${erroredDocuments.length} documentos`);
    }
    
    const message = `🔸 Reindexación completada. ${products.length} productos procesados.`;
    console.log(message);
    return { success: true, message };
  } catch (error) {
    console.error('🔸 Error en reindexación:', {
      message: error.message,
      stack: error.stack,
      elasticError: error.meta?.body?.error
    });
    throw error;
  }
};

module.exports = { reindexAllProducts };