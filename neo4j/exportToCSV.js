const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { format } = require('@fast-csv/format');

// ⚠️ Cambia estos valores según tu entorno
const pool = new Pool({
  user: 'postgres',
  host: 'db',
  database: 'Restaurante',
  password: 'mitzy',
  port: 5432,
});

const tables = [
  'users',
  'restaurants',
  'menus',
  'reservations',
  'orders',
  'products',
  'menu_items',
  'order_revenue'
];

async function exportTableToCSV(tableName) {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT * FROM ${tableName}`);
    console.log('📌 Guardando en:', path.join(__dirname, 'exports', `${tableName}.csv`));
    const filePath = path.join(__dirname, 'exports', `${tableName}.csv`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    const ws = fs.createWriteStream(filePath);
    const csvStream = format({ headers: true });

    csvStream.pipe(ws).on('finish', () => {
      console.log(`✅ Exportado: ${tableName}.csv`);
    });

    res.rows.forEach(row => csvStream.write(row));
    csvStream.end();
  } catch (err) {
    console.error(`❌ Error en ${tableName}:`, err);
  } finally {
    client.release();
  }
}

async function main() {
  for (const table of tables) {
    await exportTableToCSV(table);
  }
  await pool.end();
}

main();
