const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  changeUserStatus,
  resetUserPassword,
  bulkUserAction
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All user management requires authentication

router.route('/')
  .get(getUsers)
  .post(createUser);

router.post('/bulk', bulkUserAction);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(authorize('Super Admin'), deleteUser);

router.patch('/:id/status', changeUserStatus);
router.patch('/:id/reset-password', resetUserPassword);

module.exports = router;
