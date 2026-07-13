const { logAction } = require('../utils/logger');
const {
  getSharedVacancies,
  createSharedVacancy,
  updateSharedVacancy,
  deleteSharedVacancy,
  archiveSharedExpiredVacancies
} = require('../utils/sharedData');

// @desc    Get all vacancies with filters
// @route   GET /api/vacancies
// @access  Private
exports.getVacancies = async (req, res) => {
  try {
    const { search, status, location, sortBy, order, page = 1, limit = 10 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (location) query.location = { $regex: location, $options: 'i' };

    let sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = order === 'desc' ? -1 : 1;
    } else {
      sortOptions['createdAt'] = -1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sharedVacancies = getSharedVacancies();
    const filteredVacancies = sharedVacancies.filter((item) => {
      if (search) {
        const term = search.toLowerCase();
        if (!item.title?.toLowerCase().includes(term) && !item.location?.toLowerCase().includes(term)) {
          return false;
        }
      }
      if (status && item.status !== status) return false;
      if (location && !item.location?.toLowerCase().includes(location.toLowerCase())) return false;
      return true;
    });

    const sortedVacancies = [...filteredVacancies].sort((a, b) => {
      const direction = order === 'desc' ? -1 : 1;
      if (sortBy === 'title') return direction * String(a.title || '').localeCompare(String(b.title || ''));
      return direction * new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    const pagedVacancies = sortedVacancies.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      totalVacancies: sortedVacancies.length,
      pages: Math.max(1, Math.ceil(sortedVacancies.length / parseInt(limit))),
      currentPage: parseInt(page),
      vacancies: pagedVacancies
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get single vacancy
// @route   GET /api/vacancies/:id
// @access  Private
exports.getVacancy = async (req, res) => {
  try {
    const vacancy = getSharedVacancies().find((item) => item._id === req.params.id);

    if (!vacancy) {
      return res.status(404).json({ success: false, message: 'Vacancy not found' });
    }

    res.status(200).json({ success: true, vacancy });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Add vacancy manually
// @route   POST /api/vacancies
// @access  Private
exports.createVacancy = async (req, res) => {
  try {
    const { title, description, location, rent, smartDoor, createdBy, expiresAt } = req.body;

    const vacancy = createSharedVacancy({
      title,
      description,
      location,
      rent,
      salary: rent,
      smartDoor: smartDoor || null,
      createdBy,
      createdByUser: createdBy,
      expiresAt: expiresAt || null,
      status: 'Active'
    });

    await logAction(req, 'VACANCY_CREATE', `Created new vacancy: "${title}" in ${location}`);

    res.status(201).json({ success: true, vacancy });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Edit vacancy
// @route   PUT /api/vacancies/:id
// @access  Private
exports.updateVacancy = async (req, res) => {
  try {
    const { title, description, location, rent, status, smartDoor, expiresAt } = req.body;
    const vacancy = updateSharedVacancy(req.params.id, { title, description, location, rent, status, smartDoor, expiresAt });

    if (!vacancy) {
      return res.status(404).json({ success: false, message: 'Vacancy not found' });
    }

    await logAction(req, 'VACANCY_UPDATE', `Updated vacancy details for ID: ${req.params.id}`);

    res.status(200).json({ success: true, vacancy });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete vacancy
// @route   DELETE /api/vacancies/:id
// @access  Private (SuperAdmin Only)
exports.deleteVacancy = async (req, res) => {
  try {
    const vacancy = getSharedVacancies().find((item) => item._id === req.params.id);

    if (!vacancy) {
      return res.status(404).json({ success: false, message: 'Vacancy not found' });
    }

    deleteSharedVacancy(req.params.id);

    await logAction(req, 'VACANCY_DELETE', `Deleted vacancy: "${vacancy.title}"`);

    res.status(200).json({ success: true, message: 'Vacancy deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Approve/Reject a vacancy submission
// @route   PATCH /api/vacancies/:id/approval
// @access  Private
exports.approveVacancy = async (req, res) => {
  const { status } = req.body; // 'Active' or 'Rejected'

  if (!['Active', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status for approval. Must be Active or Rejected' });
  }

  try {
    const vacancy = updateSharedVacancy(req.params.id, { status });

    if (!vacancy) {
      return res.status(404).json({ success: false, message: 'Vacancy not found' });
    }

    await logAction(req, `VACANCY_${status.toUpperCase()}`, `${status} vacancy: "${vacancy.title}"`);

    res.status(200).json({ success: true, vacancy });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Mark vacancy as filled
// @route   PATCH /api/vacancies/:id/filled
// @access  Private
exports.markAsFilled = async (req, res) => {
  try {
    const vacancy = updateSharedVacancy(req.params.id, { status: 'Filled' });

    if (!vacancy) {
      return res.status(404).json({ success: false, message: 'Vacancy not found' });
    }

    await logAction(req, 'VACANCY_FILLED', `Marked vacancy as filled: "${vacancy.title}"`);

    res.status(200).json({ success: true, vacancy });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Archive expired vacancies
// @route   POST /api/vacancies/archive-expired
// @access  Private
exports.archiveExpired = async (req, res) => {
  try {
    const archivedCount = archiveSharedExpiredVacancies();

    await logAction(req, 'VACANCY_ARCHIVE_EXPIRED', `Archived ${archivedCount} expired vacancies`);

    res.status(200).json({ success: true, message: `Archived ${archivedCount} expired vacancies` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
