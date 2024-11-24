const admin = require('../services/dataStore');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

require('dotenv').config();

// Secret key for JWT
const JWT_SECRET = process.env.SECRET_KEY;

// Register
const register = async (req, res) => {
    const { nama, email, password } = req.body;

    if (!nama || !email || !password) {
        return res.status(400).json({ message: 'Pengisian Form Belum Selesai' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email,
            password,
        });

        const userId = userRecord.uid;

        // Save user details in Firestore
        await admin.firestore().collection('User').doc(userId).set({
            id: userId,
            nama,
            email,
            password: hashedPassword,
        });

        res.status(201).json({
            message: 'Registrasi berhasil',
            user: { id: userId, nama, email },
        });
    } catch (error) {
        res.status(500).json({ message: `Error: ${error.message}` });
    }
};

// Login
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Pengisian Form Belum Selesai' });
    }

    try {
        const user = await admin.auth().getUserByEmail(email);
        const userDoc = await admin.firestore().collection('User').doc(user.uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Email atau password salah' });
        }

        const userData = userDoc.data();
        const passwordMatch = await bcrypt.compare(password, userData.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }

        // Generate JWT token for user
        const token = jwt.sign({ id: userData.id, email: userData.email }, JWT_SECRET, {
            expiresIn: '365d',
        });

        req.session.user = { id: userData.id, nama: userData.nama, email: userData.email };
        res.status(200).json({
            message: 'Login berhasil',
            user: { email: userData.email, token },
        });
    } catch (error) {
        res.status(500).json({ message: `Error: ${error.message}` });
    }
};

// Logout
const logout = (req, res) => {
    //No user login
    if (!req.session.user) {
        return res.status(400).json({ message: 'Tidak ada user yang login' });
    }

    // Destroy Session
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Gagal melakukan logout' });
        }
        res.status(200).json({ message: 'Logout berhasil' });
    });
};

module.exports = { register, login, logout };
