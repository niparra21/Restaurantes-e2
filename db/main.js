const { exec } = require('child_process');
const path = require('path');

async function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const absolutePath = path.resolve(__dirname, scriptPath);
    const proc = exec(`node ${absolutePath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error en ${scriptPath}:`, error.message);
        return reject(error);
      }
      console.log(`✅ ${scriptPath} completado.`);
      resolve();
    });

    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
  });
}

async function main() {
  try {
    console.log('🚀 Ejecutando fill_postgres.js...');
    await runScript('fill_postgres.js');

    console.log('📤 Ejecutando exportToCSV.js...');
    await runScript('../neo4j/exportToCSV.js');


    console.log('🎉 ¡Todos los scripts ejecutados con éxito!');
  } catch (err) {
    console.error('🔥 Error general en main.js:', err.message);
    process.exit(1);
  }
}

main();
