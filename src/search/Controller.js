/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

const express = require('express');
const app = express();

app.use(express.json());

const { elasticClient } = require('./shared/elastic/elasticsearchClient');
const { reindexAllProducts } = require('./shared/elastic/reindexProducts');

/* --------------------------------------------------------------------- */
// GET - SEARCH PRODUCTS

const searchProducts = async (req, res) => {
  const { q, category } = req.query;                                                                // extract search term and category from query params
  
  try {
    let query = {};                                                                                 // will hold the ElasticSearch query
    
    // 1. Build the ElasticSearch query based on parameters
    if (q && category) {                                                                            // if both search term and category are provided
      query = {
        bool: {
          must: [
            {
              multi_match: {
                query: q,
                fields: ['name^3', 'description'],
                fuzziness: 'AUTO'
              }
            },
            { match: { category: category } }
          ]
        }
      };
    } else if (q) {                                                                                 // if only search term is provided
      query = {
        multi_match: {
          query: q,
          fields: ['name^3', 'description'],
          fuzziness: 'AUTO'
        }
      };
    } else if (category) {                                                                          // if only category is provided
      query = { match: { category: category } };
    } else {                                                                                        // if neither is provided, return error
      return res.status(400).json({ message: 'Debe proporcionar término de búsqueda (q) o categoría' });
    }

    // 2. Execute the search query in ElasticSearch
    const response = await elasticClient.search({
      index: 'products',
      body: {
        query: query
      }
    });

    // 3. Format and return the results
    const results = response.hits.hits.map(hit => ({
      id: hit._source.id,
      ...hit._source,
      highlight: hit.highlight
    }));

    res.json(results);                                                                              // return the search results
  } catch (error) {                                                                                 // handle errors
    console.error('Error buscando productos:', error);
    res.status(500).json({ 
      message: 'Error buscando productos', 
      error: error.message || error 
    });
  }
};

/* --------------------------------------------------------------------- */
// GET - SEARCH BY CATEGORY ONLY

const searchByCategory = async (req, res) => {
  const { category } = req.params;
  
  try {
    const response = await elasticClient.search({
      index: 'products',
      body: {
        query: {
          match: { 
            category: category 
          }
        }
      }
    });

    const results = response.hits.hits.map(hit => ({
      id: hit._source.id,
      ...hit._source
    }));

    res.json(results);
  } catch (error) {
    console.error('Error buscando por categoría:', error);
    res.status(500).json({ 
      message: 'Error buscando productos por categoría',
      error: error.message 
    });
  }
};

/* --------------------------------------------------------------------- */
// POST - REINDEX PRODUCTS

const reindexProducts = async (req, res) => {
  try {
    const result = await reindexAllProducts();
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error en reindexación manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error durante la reindexación',
      error: error.message
    });
  }
};


module.exports = { searchProducts, searchByCategory, reindexProducts };