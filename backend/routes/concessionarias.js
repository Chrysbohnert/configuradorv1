const { Router } = require('express');
const ctrl = require('../controllers/concessionariasController');
const { requireAuth, requireAdmin, requireAdminFull } = require('../middleware/auth');
const { isAdminConcessionarias, isAdminFull } = require('../utils/permissions');

const router = Router();

function requireAdminConcessionariasOrFull(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Não autenticado' });
  if (!isAdminFull(req.user) && !isAdminConcessionarias(req.user)) {
    return res.status(403).json({ success: false, error: 'Acesso negado' });
  }
  next();
}

router.get('/',    requireAuth, requireAdmin, ctrl.getConcessionarias);
router.get('/:id', requireAuth, requireAdmin, ctrl.getConcessionariaById);
router.post('/',   requireAuth, requireAdminConcessionariasOrFull, ctrl.createConcessionaria);
router.put('/:id', requireAuth, requireAdminConcessionariasOrFull, ctrl.updateConcessionaria);
router.delete('/:id', requireAuth, requireAdminFull, ctrl.deleteConcessionaria);

module.exports = router;
