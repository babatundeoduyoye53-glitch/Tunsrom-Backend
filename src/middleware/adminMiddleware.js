const jwt = require('jsonwebtoken');

// Protect admin routes — requires valid admin JWT
function adminProtect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Admin access required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Admin access only.' });
    }

    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired admin token.' });
  }
}

module.exports = { adminProtect };
