const admin = require('../services/dataStore');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

require('dotenv').config();

// Secret key for JWT
const JWT_SECRET = process.env.SECRET_KEY;

// Register
const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Pengisian Form Belum Selesai' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Default profile picture URL
        const defaultProfilePicture = process.env.DEFAULT_USER_PROFILE;

        // Create user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email,
            password,
        });

        const userId = userRecord.uid;

        // Save user details in Firestore
        await admin.firestore().collection('users').doc(userId).set({
            id: userId,
            name,
            email,
            password: hashedPassword,
            no_hp:'',
            age:'',
            gender:'',
            profilePicture: defaultProfilePicture, // Add profile picture URL
            token:'',
        });

        res.status(201).json({
            message: 'Registrasi berhasil',
            user: { id: userId, name, email, profilePicture: defaultProfilePicture },
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
        const userDoc = await admin.firestore().collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Email atau password salah' });
        }

        const userData = userDoc.data();
        const passwordMatch = await bcrypt.compare(password, userData.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: userData.id, email: userData.email }, JWT_SECRET, {
            expiresIn: '365d',
        });

        // Update token di Firestore
        await admin.firestore().collection('users').doc(user.uid).update({ token });

        res.status(200).json({
            message: 'Login berhasil',
            user: { id: userData.id, email: userData.email, token },
        });
    } catch (error) {
        res.status(500).json({ message: `Error: ${error.message}` });
    }
};

// Logout
const logout = async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1]; // Format: "Bearer <token>"

    try {
        // Verifikasi token JWT
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;

        const userDocRef = admin.firestore().collection('users').doc(userId);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        }

        const userData = userDoc.data();

        // Periksa apakah token sama dengan yang di firestore
        if (userData.token !== token) {
            return res.status(401).json({ message: 'Token tidak valid atau sudah logout' });
        }

        // Hapus token dari Firestore
        await userDocRef.update({ token: '' });

        res.status(200).json({ message: 'Logout berhasil' });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Token tidak valid' });
        }

        res.status(500).json({ message: `Error: ${error.message}` });
    }
};

// Dashboard
const dashboard = async (req, res) => {
    const userId = req.user.id; // Ambil user ID dari token

    try {
        const userDoc = await admin.firestore().collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Data user tidak ditemukan' });
        }

        const userData = userDoc.data();
        res.status(200).json({
            message: 'Berhasil mengambil data dashboard',
            user: {
                name: userData.name,
                email: userData.email,
                profilePicture: userData.profilePicture,
                no_hp: userData.no_hp,
                age: userData.age,
                gender: userData.gender,
            },
        });
    } catch (error) {
        res.status(500).json({ message: `Error: ${error.message}` });
    }
};

//Change Password
const ChangePassword = async (req, res) => {
    try {
        const { id: userId } = req.user; // Ambil userId dari middleware otentikasi
        const { passwordLama, passwordBaru } = req.body;

        if (!passwordLama || !passwordBaru) {
            return res.status(400).json({ message: 'Password lama dan password baru harus diisi' });
        }

        // Ambil data user dari Firestore
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Data user tidak ditemukan' });
        }

        const userData = userDoc.data();

        // Verifikasi password lama
        const isPasswordMatch = await bcrypt.compare(passwordLama, userData.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Password lama salah' });
        }

        // Hash password baru
        const hashedPassword = await bcrypt.hash(passwordBaru, 10);

        // Update password di Firebase Authentication
        await admin.auth().updateUser(userId, {
            password: passwordBaru,
        });

        // Update password di Firestore
        await admin.firestore().collection('users').doc(userId).update({
            password: hashedPassword,
        });

        res.status(200).json({ message: 'Password berhasil diperbarui' });
    } catch (error) {
        res.status(500).json({ message: `Error: ${error.message}` });
    }
};

// Ganti Data



const bucket = admin.storage().bucket();

// Konfigurasi multer untuk menangani file upload
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Hanya file gambar (JPEG, PNG) yang diperbolehkan'));
        }
        cb(null, true);
    },
});

const changeData = async (req, res) => {
    try {
        const userId = req.user.id; // Ambil userId dari `req.user` yang diset oleh middleware otentikasi
        const { name, email, no_hp, age, gender } = req.body;

        // Validasi gender
        if (gender !== undefined && ![0, 1].includes(Number(gender))) {
            return res.status(400).json({ message: 'Jenis kelamin harus bernilai 0 atau 1' });
        }

        const updatedData = {};
        if (name) updatedData.name = name;
        if (email) updatedData.email = email;
        if (no_hp) updatedData.no_hp = no_hp;
        if (age) updatedData.age = age;
        if (gender !== undefined) updatedData.gender = gender;

        // Periksa apakah ada file untuk foto profil
        if (req.file) {
            const file = req.file;
            const extension = path.extname(file.originalname);
            const newFileName = `userProfile/${uuidv4()}${extension}`;
            const fileUpload = bucket.file(newFileName);

            await fileUpload.save(file.buffer, {
                contentType: file.mimetype,
                public: true,
            });

            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${newFileName}`;
            updatedData.profilePicture = publicUrl;
        }

        // Jika tidak ada perubahan data atau file
        if (Object.keys(updatedData).length === 0) {
            return res.status(400).json({ message: 'Tidak ada perubahan data' });
        }

        // Update data di Firestore
        await admin.firestore().collection('users').doc(userId).update(updatedData);

        // Update email di Firebase Authentication jika ada
        if (email) {
            await admin.auth().updateUser(userId, { email });
        }

        res.status(200).json({
            message: 'Data berhasil diperbarui',
            updatedData,
        });
    } catch (error) {
        res.status(500).json({ message: `Error: ${error.message}` });
    }
};


module.exports = { register, login, logout, dashboard, ChangePassword, changeData, upload};