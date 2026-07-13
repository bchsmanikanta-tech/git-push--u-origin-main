const {
  getSmartDoors,
  getSmartDoorById,
  createSmartDoor,
  updateSmartDoor,
  deleteSmartDoor,
  toggleSmartDoor
} = require('../utils/sharedData');

// @desc    Get all smart doors
// @route   GET /api/smart-doors
// @access  Private
exports.getSmartDoors = async (req, res) => {
  try {
    const { status, isEnabled, search } = req.query;
    let doors = await getSmartDoors({
      status,
      isEnabled: isEnabled === undefined ? undefined : isEnabled === 'true',
      search
    });

    res.status(200).json({ success: true, count: doors.length, doors });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get single smart door
// @route   GET /api/smart-doors/:id
// @access  Private
exports.getSmartDoor = async (req, res) => {
  try {
    const door = await getSmartDoorById(req.params.id);

    if (!door) {
      return res.status(404).json({ success: false, message: 'Smart Door not found' });
    }

    res.status(200).json({ success: true, door });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Add smart door
// @route   POST /api/smart-doors
// @access  Private
exports.createSmartDoor = async (req, res) => {
  try {
    const { doorId, name, status, isEnabled } = req.body;

    const existing = await getSmartDoors({});
    if (existing.some((d) => d.doorId === doorId)) {
      return res.status(400).json({ success: false, message: 'Door ID already registered' });
    }

    const door = await createSmartDoor({ doorId, name, status, isEnabled });

    res.status(201).json({ success: true, door });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Edit smart door
// @route   PUT /api/smart-doors/:id
// @access  Private
exports.updateSmartDoor = async (req, res) => {
  try {
    const { name, status, isEnabled, doorId } = req.body;
    const door = await updateSmartDoor(req.params.id, { name, status, isEnabled, doorId });

    if (!door) {
      return res.status(404).json({ success: false, message: 'Smart Door not found' });
    }

    res.status(200).json({ success: true, door });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete smart door
// @route   DELETE /api/smart-doors/:id
// @access  Private (SuperAdmin Only)
exports.deleteSmartDoor = async (req, res) => {
  try {
    const removed = await deleteSmartDoor(req.params.id);

    if (!removed) {
      return res.status(404).json({ success: false, message: 'Smart Door not found' });
    }

    res.status(200).json({ success: true, message: 'Smart Door deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Toggle Enable/Disable smart door
// @route   PATCH /api/smart-doors/:id/toggle
// @access  Private
exports.toggleSmartDoor = async (req, res) => {
  try {
    const door = await toggleSmartDoor(req.params.id);

    if (!door) {
      return res.status(404).json({ success: false, message: 'Smart Door not found' });
    }

    res.status(200).json({ success: true, door });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
