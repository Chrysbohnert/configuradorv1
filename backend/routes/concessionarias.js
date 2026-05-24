const { Router } = require('express');
const ctrl = require('../controllers/concessionariasController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

router.get('/',    requireAuth, ctrl.getConcessionarias);
router.get('/:id', requireAuth, ctrl.getConcessionariaById);
router.post('/',   requireAuth, requireAdmin, ctrl.createConcessionaria);
router.put('/:id', requireAuth, requireAdmin, ctrl.updateConcessionaria);
router.delete('/:id', requireAuth, requireAdmin, ctrl.deleteConcessionaria);

module.exports = router;
