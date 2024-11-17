// app.js
const express = require('express');
const session = require('express-session');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const router = require('./routers/routers');

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Konfigurasi session
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set ke true jika menggunakan HTTPS
}));

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

// Middleware periksa session
app.use((req, res, next) => {
    if (req.session.user && req.path === '/login') {
        return res.redirect('/');
    }
    next();
});

// Gunakan router
app.use('/', router); // Menggunakan router untuk semua rute

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server berjalan pada http://localhost:${PORT}`);
});