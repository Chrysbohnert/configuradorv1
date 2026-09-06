/**
 * routes/graficos_carga.js
 * Gráficos de carga — PostgreSQL.
 *
 * Uploads novos: salvos localmente em uploads/graficos-carga/ (sem Supabase).
 * Registros antigos com URL do Supabase continuam funcionando normalmente.
 */

const path = require('path');
const fs = require('fs');
const { Router } = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/graficosCargaService');
const { requireAuth, requireAdminFull } = require('../middleware/auth');

const router = Router();

// ─── Diretório de upload local ─────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'graficos-carga');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ─── Multer: disco local, somente PDF, nome único ──────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) { cb(null, UPLOAD_DIR); },
    filename(_req, _file, cb) {
      const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      cb(null, `grafico_${uid}.pdf`);
    },
  }),
  limits: { fileSize: 52_428_800 }, // 50 MB
  fileFilter(_req, file, cb) {
    cb(null, file.mimetype === 'application/pdf');
  },
});

// Retorna true se a URL aponta para um arquivo local (não Supabase)
function isLocalFile(url) {
  return typeof url === 'string' && url.includes('/uploads/graficos-carga/');
}

// ─── POST /upload ──────────────────────────────────────────────────────────────
router.post('/upload', requireAuth, requireAdminFull, upload.single('arquivo'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res_.badRequest(res, 'Nenhum arquivo PDF enviado');
  }

  // Constrói a URL pública usando a origem da requisição (suporta proxy reverso)
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const baseUrl = process.env.API_BASE_URL || `${proto}://${req.get('host')}`;
  const publicUrl = `${baseUrl}/uploads/graficos-carga/${req.file.filename}`;

  return res_.ok(res, { url: publicUrl });
}));

// ─── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.findAll();
  return res_.ok(res, data, { count: data.length });
}));

// ─── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.findById(req.params.id);
  if (!data) return res_.notFound(res, 'Gráfico de carga não encontrado');
  return res_.ok(res, data);
}));

// ─── POST / (criar registro) ───────────────────────────────────────────────────
router.post('/', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) {
    return res_.badRequest(res, 'nome é obrigatório');
  }
  const created = await svc.create(req.body);
  return res_.created(res, created);
}));

// ─── PUT /:id ──────────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const updated = await svc.update(req.params.id, req.body);
  if (!updated) return res_.notFound(res, 'Gráfico de carga não encontrado');
  return res_.ok(res, updated);
}));

// ─── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  // Busca o registro antes de remover para poder apagar o arquivo local, se houver
  const grafico = await svc.findById(req.params.id);
  if (!grafico) return res_.notFound(res, 'Gráfico de carga não encontrado');

  const deleted = await svc.remove(req.params.id);
  if (!deleted) return res_.notFound(res, 'Gráfico de carga não encontrado');

  // Remove o arquivo do disco apenas se for uma URL local (não Supabase)
  if (isLocalFile(grafico.arquivo_url)) {
    const filePath = path.join(UPLOAD_DIR, path.basename(grafico.arquivo_url));
    fs.unlink(filePath, (err) => {
      if (err) console.warn('[graficos] Arquivo não encontrado para remoção:', err.message);
    });
  }

  return res_.ok(res, { message: 'Gráfico removido com sucesso' });
}));

module.exports = router;
