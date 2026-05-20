/**
 * routes/index.js
 * Ponto central de roteamento.
 * Todas as rotas da API são registradas aqui.
 *
 * Base URL: /api
 */

const { Router } = require('express');

const healthRouter          = require('./health');
const usersRouter           = require('./users');
const authRouter            = require('./auth');
const guindastesRouter      = require('./guindastes');
const propostasRouter       = require('./propostas');
const paymentPlansRouter    = require('./payment_plans');
const configuracoesRouter   = require('./configuracoes');
const fretesRouter          = require('./fretes');
const graficosCargaRouter   = require('./graficos_carga');

const router = Router();

router.use('/health',          healthRouter);
router.use('/users',           usersRouter);
router.use('/auth',            authRouter);
router.use('/guindastes',      guindastesRouter);
router.use('/propostas',       propostasRouter);
router.use('/payment-plans',   paymentPlansRouter);
router.use('/configuracoes',   configuracoesRouter);
router.use('/fretes',          fretesRouter);
router.use('/graficos-carga',  graficosCargaRouter);

module.exports = router;
