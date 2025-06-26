console.log('📦 Cargando neo4j-driver...');
let neo4j;
try {
  neo4j = require('neo4j-driver');
  console.log('✅ neo4j-driver cargado correctamente.');
} catch (err) {
  console.error('❌ Error cargando neo4j-driver:', err);
  process.exit(1);
}

console.log('📁 Explorando carpeta cypher...');
const fs = require('fs');
const path = require('path');

const cypherDir = path.join(__dirname, 'cypher');
console.log('📂 Directorio completo:', cypherDir);

let files;
try {
  files = fs.readdirSync(cypherDir);
  console.log('📄 Archivos encontrados:', files);
} catch (err) {
  console.error('❌ Error leyendo la carpeta cypher:', err);
  process.exit(1);
}
