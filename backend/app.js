require('dotenv').config();

const express = require('express');
const cors = require('cors');

const router = require('./routes/index');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://192.168.100.124:5173',
  'https://starkindustrial.ind.br',
  'https://www.starkindustrial.ind.br',
  'https://api-pedidos.starkindustrial.ind.br',
  'https://configurador.starkindustrial.ind.br',
];

const corsOptions = {
  origin(origin, callback) {
    // Permitir requests sem origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Em dev, aceitar qualquer localhost/192.168.x.x
    if (process.env.NODE_ENV !== 'production' && (/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin))) {
      return callback(null, true);
    }
    return callback(new Error(`CORS bloqueado para origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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