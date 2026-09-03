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
const concessionariasRouter = require('./concessionarias');
const metasRouter           = require('./metas');
const concPrecosRouter      = require('./concessionaria_precos');
const solicitacoesDescontoRouter = require('./solicitacoes_desconto');
const clientesRouter        = require('./clientes');
const areasRouter           = require('./areas');
const precificacaoRouter    = require('./precificacao');
const tributacaoRouter      = require('./tributacao');
const precificacaoCondicoesRouter = require('./precificacaoCondicoes');
const precificacaoSimuladorRouter = require('./precificacaoSimulador');
const precificacaoParametrosRouter = require('./precificacaoParametros');
const erpImportRouter       = require('./erp_import');

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
router.use('/concessionarias', concessionariasRouter);
router.use('/metas',           metasRouter);
router.use('/concessionaria-precos', concPrecosRouter);
router.use('/solicitacoes-desconto', solicitacoesDescontoRouter);
router.use('/clientes',        clientesRouter);
router.use('/areas',           areasRouter);
router.use('/precificacao',    precificacaoRouter);
router.use('/tributacao',      tributacaoRouter);
router.use('/precificacao-condicoes', precificacaoCondicoesRouter);
router.use('/precificacao-simulador', precificacaoSimuladorRouter);
router.use('/precificacao-parametros', precificacaoParametrosRouter);
router.use('/erp-import',      erpImportRouter);

module.exports = router;