const express = require('express');
const router = express.Router();
const {
  getVacancies,
  getVacancy,
  createVacancy,
  updateVacancy,
  deleteVacancy,
  approveVacancy,
  markAsFilled,
  archiveExpired
} = require('../controllers/vacancyController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes require admin authentication

router.route('/')
  .get(getVacancies)
  .post(createVacancy);

router.post('/archive-expired', archiveExpired);

router.route('/:id')
  .get(getVacancy)
  .put(updateVacancy)
  .delete(authorize('Super Admin'), deleteVacancy);

router.patch('/:id/approval', approveVacancy);
router.patch('/:id/filled', markAsFilled);

module.exports = router;
