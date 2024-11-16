const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

if (!process.env.FIREBASE_PROJECT_ID || 
    !process.env.FIREBASE_PRIVATE_KEY || 
    !process.env.FIREBASE_CLIENT_EMAIL || 
    !process.env.FIREBASE_WEB_API_KEY) {
    console.error('Missing Firebase environment variables');
    process.exit(1);
}

// Inisialisasi firebase admin
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
});

// Login_Email-Password
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY}`, {
            email,
            password,
            returnSecureToken: true,
        });

        const { email: userEmail } = response.data;

        // Mengirimkan respons yang hanya berisi data yang diinginkan
        return res.status(200).json({
            message: "Login berhasil",
            data: {
                email: userEmail
            }
        });
    } catch (error) {
        console.log("Email atau password salah");
        return res.status(400).json({ message: "Email atau password salah", error: error.response.data.error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan pada http://localhost:${PORT}`);
});
 