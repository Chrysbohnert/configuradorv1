require('dotenv').config();

const express = require('express');
const cors = require('cors');

const router = require('./routes/index');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true
}));

app.options('*', cors({
  origin: true,
  credentials: true
}));

// ─── BODY PARSING ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── LOG (apenas em desenvolvimento) ──────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// ─── ROTAS ────────────────────────────────────────────────────────────────────
app.use('/api', router);

// ─── RAIZ ─────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ message: 'API Stark Configurador - OK', version: '1.0.0' });
});

// ─── 404 / ERROS ──────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;