const { Router } = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/erpImportService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    const validExtension = /\.(csv|xlsx)$/i.test(file.originalname || '');
    callback(null, validExtension);
  },
});

router.post('/importar', requireAuth, requireAdmin, upload.single('arquivo'), asyncHandler(async (req, res) => {
  if (!req.file) return res_.badRequest(res, 'Envie um arquivo ERP no formato .csv ou .xlsx');
  const data = await svc.importSnapshot({
    buffer: req.file.buffer,
    filename: req.file.originalname,
    user: req.user,
  });
  return res_.created(res, data);
}));

router.get('/atual', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const data = await svc.findCurrent();
  if (!data) return res_.notFound(res, 'Nenhum lote ERP concluído foi encontrado');
  return res_.ok(res, data, { count: data.itens.length });
}));

module.exports = router;
