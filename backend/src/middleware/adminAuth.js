const auth = require('./auth');

function adminAuth(req, res, next) {
  return auth()(req, res, () => {
    if (String(req.user?.role || req.user?.account_type || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access is required.' });
    }
    next();
  });
}

module.exports = adminAuth;
