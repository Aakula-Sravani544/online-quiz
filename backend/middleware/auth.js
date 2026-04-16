const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    let token = req.headers['authorization'];
    
    if (!token && req.query.token) {
        token = `Bearer ${req.query.token}`;
    }
    
    if (!token) {
        return res.status(403).json({ error: 'A token is required for authentication' });
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('CRITICAL ERROR: JWT_SECRET is missing from environment!');
        } else {
            console.log('DEBUG: Middleware Secret Prefix:', secret.substring(0, 4));
        }
        const decoded = jwt.verify(token.replace('Bearer ', ''), secret);
        req.user = decoded;
    } catch (err) {
        console.error('Token Verification Failed:', err.message);
        return res.status(401).json({ error: 'Invalid Token' });
    }
    return next();
};

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Requires admin privileges' });
        }
    });
};

module.exports = { verifyToken, verifyAdmin };
