/**
 * routes/acessorios.js
 * CRUD de acessórios comerciais, disponível apenas para admin_full.
 */

const path = require('path');
const fs = require('fs');
const { Router } = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/acessoriosService');
const { requireAuth, requireAdminFull } = require('../middleware/auth');

const router = Router();

// ─── Upload local de imagens de acessórios ─────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'acessorios');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const IMAGEM_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) { cb(null, UPLOAD_DIR); },
    filename(_req, file, cb) {
      const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const original = file.originalname || 'image.jpg';
      const ext = path.extname(original).toLowerCase() || '.jpg';
      cb(null, `acessorio_${uid}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    if (!file.mimetype || !IMAGEM_MIMETYPES.includes(file.mimetype)) {
      return cb(null, false);
    }
    cb(null, true);
  },
});

const handleUpload = (req, res, next) => {
  upload.single('arquivo')(req, res, (err) => {
    if (err) {
      console.error('❌ [acessorios/upload] Erro no multer:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Falha no upload da imagem',
      });
    }
    next();
  });
};

router.post('/upload', requireAuth, requireAdminFull, handleUpload, asyncHandler(async (req, res) => {
  if (!req.file) {
    return res_.badRequest(res, 'Envie uma imagem JPG, PNG ou WEBP de até 5MB');
  }

  const proto = req.get('x-forwarded-proto') || req.protocol;
  const baseUrl = process.env.API_BASE_URL || `${proto}://${req.get('host')}`;
  const publicUrl = `${baseUrl}/uploads/acessorios/${req.file.filename}`;

  return res_.ok(res, { url: publicUrl });
}));

router.get('/', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const data = await svc.findAll();
  return res_.ok(res, data, { count: data.length });
}));

router.get('/:id', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const data = await svc.findById(req.params.id);
  if (!data) return res_.notFound(res, 'Acessório não encontrado');
  return res_.ok(res, data);
}));

router.post('/', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const { codigo, nome } = req.body;
  if (!codigo || !String(codigo).trim() || !nome || !String(nome).trim()) {
    return res_.badRequest(res, 'Código e nome são obrigatórios');
  }
  const data = await svc.create(req.body);
  return res_.created(res, data);
}));

router.put('/:id', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const { codigo, nome } = req.body;
  if (!codigo || !String(codigo).trim() || !nome || !String(nome).trim()) {
    return res_.badRequest(res, 'Código e nome são obrigatórios');
  }
  const data = await svc.update(req.params.id, req.body);
  if (!data) return res_.notFound(res, 'Acessório não encontrado');
  return res_.ok(res, data);
}));

router.delete('/:id', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const deleted = await svc.remove(req.params.id);
  if (!deleted) return res_.notFound(res, 'Acessório não encontrado');
  return res_.ok(res, { message: 'Acessório removido' });
}));

module.exports = router;
