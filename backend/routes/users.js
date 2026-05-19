const { Router } = require('express');
const ctrl = require('../controllers/usersController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

router.post('/login', ctrl.login);
router.get('/me', requireAuth, ctrl.getMe);

router.get('/', requireAuth, requireAdmin, ctrl.getUsers);
router.get('/:id', requireAuth, ctrl.getUserById);
router.post('/', requireAuth, requireAdmin, ctrl.createUser);
router.put('/:id', requireAuth, requireAdmin, ctrl.updateUser);
router.delete('/:id', requireAuth, requireAdmin, ctrl.deleteUser);

module.exports = router;
