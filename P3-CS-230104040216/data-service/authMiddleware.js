// authMiddleware.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization || '';

    // wajib format: Authorization: Bearer <token>
    if (!authHeader.startsWith('Bearer ')) {
        return res
            .status(401)
            .json({ message: 'Header Authorization Bearer <token> wajib' });
    }

    const token = authHeader.slice(7); // hapus 'Bearer '

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // simpan info user
        next(); // lanjut ke handler berikutnya
    } catch (err) {
        return res
            .status(401)
            .json({ message: 'Token tidak valid atau kadaluarsa' });
    }
}

module.exports = authMiddleware;
