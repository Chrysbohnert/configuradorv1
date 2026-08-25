const path = require('path');
const { Pool } = require('pg');

// Garante que o .env do backend seja carregado independentemente do cwd do processo
// (importante no Passenger/cPanel, onde o diretório de trabalho pode variar).
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Suporta tanto as variáveis DB_* do projeto quanto as variáveis padrão PG*
// usadas por alguns painéis de hospedagem/Passenger.
const DB_HOST = process.env.DB_HOST || process.env.PGHOST;
const DB_PORT = parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10);
const DB_NAME = process.env.DB_NAME || process.env.PGDATABASE;
const DB_USER = process.env.DB_USER || process.env.PGUSER;
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.PGPASSWORD;

const poolConfig = {
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  client_encoding: 'UTF8',
};

if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

// Log de diagnóstico no startup (não expõe senha).
console.log('[db/pool] PostgreSQL config:', {
  host: DB_HOST || '(não definido - pg usará padrão)',
  port: DB_PORT,
  database: DB_NAME || '(não definido)',
  user: DB_USER || '(não definido)',
  ssl: !!poolConfig.ssl,
});

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('✅ PostgreSQL conectado');
});

pool.on('error', (err) => {
  console.error('❌ Erro PostgreSQL:', err.message);
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

module.exports = {
  pool,
  query,
  getClient,
};