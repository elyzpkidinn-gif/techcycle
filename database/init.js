require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../db');

async function initialize() {
  await db.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  await db.query(fs.readFileSync(path.join(__dirname, 'username-blocklist.sql'), 'utf8'));
  console.log('Estrutura PostgreSQL criada/atualizada com sucesso.');
  await db.close();
}

initialize().catch(async (error) => {
  console.error('Não foi possível criar o esquema:', error.message);
  await db.close();
  process.exitCode = 1;
});
