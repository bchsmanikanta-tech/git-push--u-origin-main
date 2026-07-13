const jwt = require('jsonwebtoken');
const { getSharedAdminById } = require('../utils/sharedData');

// Protect routes - Verify Admin JWT
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-admin-secret';
    const decoded = jwt.verify(token, secret);
    req.admin = getSharedAdminById(decoded.id);

    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    if (req.admin.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Admin account has been suspended' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Admin role '${req.admin?.role}' is not authorized to access this route` 
      });
    }
    next();
  };
};
