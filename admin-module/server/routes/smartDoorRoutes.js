const express = require('express');
const router = express.Router();
const {
  getSmartDoors,
  getSmartDoor,
  createSmartDoor,
  updateSmartDoor,
  deleteSmartDoor,
  toggleSmartDoor
} = require('../controllers/smartDoorController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes require admin authentication

router.route('/')
  .get(getSmartDoors)
  .post(createSmartDoor);

router.route('/:id')
  .get(getSmartDoor)
  .put(updateSmartDoor)
  .delete(authorize('Super Admin'), deleteSmartDoor);

router.patch('/:id/toggle', toggleSmartDoor);

module.exports = router;
