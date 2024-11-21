// router/router.js
const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Rute untuk halaman login (GET)
router.get('/login', (req, res) => {
    res.send('Silakan login di sini.');
});

// Login_Email-Password
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY}`, {
            email,
            password,
            returnSecureToken: true,
        });

        const { email: userEmail, idToken } = response.data;

        req.session.user = userEmail;
        req.session.idToken = idToken; // Simpan idToken di session

        return res.status(200).json({
            message: "Login berhasil",
            data: {
                email: userEmail,
                idToken: idToken
            }
        });
    } catch (error) {
        console.log("Email atau password salah");
        return res.status(400).json({ message: "Email atau password salah", error: error.response.data.error.message });
    }
});

// Route untuk logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Gagal logout:', err);
            return res.status(500).json({ message: 'Gagal logout' });
        }
        res.redirect('/login'); // Arahkan ke halaman login setelah logout
    });
});

// Route untuk registrasi
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Simpan data ke Firebase Authentication
        const authResponse = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.FIREBASE_WEB_API_KEY}`, {
            email,
            password,
            returnSecureToken: true,
        });

        const { idToken } = authResponse.data; // Mengambil ID pengguna dan token dari Firebase Authentication

        // Data berhasil didaftarkan di Firebase Authentication
        return res.status(201).json({
            message: "Registrasi berhasil",
            data: {
                name,
                email,
                idToken
            }
        });
    } catch (error) {
        console.error("Registrasi gagal:", error.response?.data?.error?.message || error.message);
        return res.status(400).json({ message: "Registrasi gagal", error: error.response?.data?.error?.message || error.message });
    }
});

module.exports = router; // Ekspor router