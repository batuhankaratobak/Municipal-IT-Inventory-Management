require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const DB_NAME = process.env.DB_NAME || 'inventory_db';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 5432);

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'superadmin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'change-this-password';
const ADMIN_ROLE = process.env.SEED_ADMIN_ROLE || 'super_admin';

function assertSafeIdentifier(value, label) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`${label} sadece harf, rakam ve alt çizgi içermeli: ${value}`);
  }
}

function createClient(database) {
  return new Client({
    user: DB_USER,
    host: DB_HOST,
    database,
    password: DB_PASSWORD,
    port: DB_PORT
  });
}

async function ensureDatabaseExists() {
  assertSafeIdentifier(DB_NAME, 'DB_NAME');

  const client = createClient('postgres');
  await client.connect();

  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);

    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(`Veritabanı oluşturuldu: ${DB_NAME}`);
    } else {
      console.log(`Veritabanı zaten var: ${DB_NAME}`);
    }
  } finally {
    await client.end();
  }
}

async function applySchemaAndSeedAdmin() {
  const client = createClient(DB_NAME);
  await client.connect();

  try {
    const schemaPath = path.join(__dirname, '..', 'PostgreSQL.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schemaSql);
    console.log('Tablolar ve başlangıç kategorileri hazır.');

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await client.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username)
       DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role`,
      [ADMIN_USERNAME, passwordHash, ADMIN_ROLE]
    );

    console.log(`İlk yönetici hazır: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  } finally {
    await client.end();
  }
}

async function main() {
  try {
    await ensureDatabaseExists();
    await applySchemaAndSeedAdmin();
    console.log('Veritabanı kurulumu tamamlandı.');
  } catch (error) {
    const nestedMessages = Array.isArray(error.errors)
      ? error.errors.map((nestedError) => nestedError.message).join(' | ')
      : '';
    console.error('Veritabanı kurulumu başarısız:', error.message || nestedMessages || error);
    process.exitCode = 1;
  }
}

main();
