const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.SECRET_KEY;

const authentication = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1]; // Format: "Bearer <token>"

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Tambah data user dari token ke request
        next(); // Lanjut ke handler berikutnya
    } catch (error) {
        return res.status(401).json({ message: 'Token tidak valid atau telah kedaluwarsa' });
    }
};

module.exports = authentication;
