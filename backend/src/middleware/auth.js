const jwt = require('jsonwebtoken');
require('dotenv').config();

function auth(required = true) {
  return (req, res, next) => {
    if (!req || !res) return next();

    const headers = req.headers || {};
    const authHeader = headers['authorization'] || headers['Authorization'];

    if (!authHeader) {
      if (required) return res.status(401).json({ message: 'Missing authorization header' });
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1] || authHeader;

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded) => {
      if (err) {
        if (required) return res.status(401).json({ message: 'Invalid token' });
        req.user = null;
      } else {
        req.user = decoded;
      }
      next();
    });
  };
}

module.exports = auth;
