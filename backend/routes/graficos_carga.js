/**
 * routes/graficos_carga.js
 * Gráficos de carga — PostgreSQL.
 */

const { Router } = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/graficosCargaService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

// ─── Upload para Supabase Storage via service role key (bypassa RLS) ───────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 52_428_800 }, // 50 MB
  fileFilter(_req, file, cb) {
    cb(null, file.mimetype === 'application/pdf');
  },
});

router.post('/upload', requireAuth, requireAdmin, upload.single('arquivo'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res_.badRequest(res, 'Nenhum arquivo PDF enviado');
  }

  const supabaseUrl  = process.env.SUPABASE_URL;
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ [upload-graficos] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no backend .env');
    return res_.serverError(res, 'Configuração de storage ausente no servidor');
  }

  const fileName   = req.body.fileName || `grafico_${Date.now()}_${req.file.originalname}`;
  const uploadUrl  = `${supabaseUrl}/storage/v1/object/graficos-carga/${encodeURIComponent(fileName)}`;

  const storageRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': req.file.mimetype,
      'x-upsert': 'true',
    },
    body: req.file.buffer,
  });

  if (!storageRes.ok) {
    const errBody = await storageRes.text();
    console.error('❌ [upload-graficos] Supabase Storage erro:', storageRes.status, errBody);
    return res_.serverError(res, `Erro no storage: ${storageRes.status}`);
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/graficos-carga/${encodeURIComponent(fileName)}`;
  return res_.ok(res, { url: publicUrl });
}));

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.findAll();
  return res_.ok(res, data, { count: data.length });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.findById(req.params.id);
  if (!data) return res_.notFound(res, 'Gráfico de carga não encontrado');
  return res_.ok(res, data);
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) {
    return res_.badRequest(res, 'nome é obrigatório');
  }
  const created = await svc.create(req.body);
  return res_.created(res, created);
}));

router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const updated = await svc.update(req.params.id, req.body);
  if (!updated) return res_.notFound(res, 'Gráfico de carga não encontrado');
  return res_.ok(res, updated);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await svc.remove(req.params.id);
  if (!deleted) return res_.notFound(res, 'Gráfico de carga não encontrado');
  return res_.ok(res, { message: 'Gráfico removido com sucesso' });
}));

module.exports = router;
