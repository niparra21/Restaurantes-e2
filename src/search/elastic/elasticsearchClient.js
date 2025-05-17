/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

const { Client } = require('@elastic/elasticsearch');

const elasticClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
  maxRetries: 5,
  requestTimeout: 60000
});

const initElasticSearch = async () => {
  try {
    console.log('▫️  Intentando conectar a ElasticSearch...');
    
    let connected = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!connected && attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`▫️  Intento de conexión a ElasticSearch ${attempts}/${maxAttempts}...`);
        await elasticClient.ping();
        connected = true;
        console.log('▫️  Conectado a ElasticSearch exitosamente!');
      } catch (err) {
        console.log(`▫️  No se pudo conectar a ElasticSearch. Esperando 5 segundos...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between attempts
      }
    }

    if (!connected) {
      throw new Error('No se pudo conectar a ElasticSearch después de múltiples intentos');
    }
    
    const indexExists = await elasticClient.indices.exists({
      index: 'products'
    });

    if (!indexExists) {
      await elasticClient.indices.create({
        index: 'products',
        body: {
          mappings: {
            properties: {
              name: { type: 'text' },
              description: { type: 'text' },
              category: { type: 'keyword' },
              restaurant_id: { type: 'keyword' }
            }
          }
        }
      });
      console.log('▫️  Índice de productos creado en ElasticSearch');
    }
  } catch (error) {
    console.error('▫️  Error inicializando ElasticSearch:', error.message);
    throw error;
  }
};

module.exports = { elasticClient, initElasticSearch };