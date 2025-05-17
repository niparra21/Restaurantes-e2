/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

const express = require('express');
const app = express();

app.use(express.json());

const { elasticClient } = require('./shared/elastic/elasticsearchClient');

/* --------------------------------------------------------------------- */
// GET - SEARCH PRODUCTS

const searchProducts = async (req, res) => {
  const { q, category } = req.query;
  
  try {
    let query = {};
    
    if (q && category) {
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
    } else if (q) {
      query = {
        multi_match: {
          query: q,
          fields: ['name^3', 'description'],
          fuzziness: 'AUTO'
        }
      };
    } else if (category) {
      query = { match: { category: category } };
    } else {
      return res.status(400).json({ message: 'Debe proporcionar término de búsqueda (q) o categoría' });
    }

    const response = await elasticClient.search({
      index: 'products',
      body: {
        query: query
      }
    });

    // Access hits directly from response
    const results = response.hits.hits.map(hit => ({
      id: hit._source.db_id,
      ...hit._source,
      highlight: hit.highlight
    }));

    res.json(results);
  } catch (error) {
    console.error('Error buscando productos:', error);
    res.status(500).json({ 
      message: 'Error buscando productos', 
      error: error.message || error 
    });
  }
};

module.exports = { searchProducts };