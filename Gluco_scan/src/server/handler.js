const admin = require('../services/dataStore');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

        // Create user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email,
            password,
        });

        const userId = userRecord.uid;

        // Save user details in Firestore
        await admin.firestore().collection('User').doc(userId).set({
            id: userId,
            name,
            email,
            password: hashedPassword,
        });

        res.status(201).json({
            message: 'Registrasi berhasil',
            user: { id: userId, name, email },
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

        req.session.user = { id: userData.id, name: userData.name, email: userData.email };
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

// Dashboard
const dashboard = async (req, res) => {
    // Periksa apakah user sudah login
    if (!req.session.user) {
        return res.status(401).json({ message: 'Anda harus login terlebih dahulu' });
    }

    try {
        const userId = req.session.user.id;

        const userDoc = await admin.firestore().collection('User').doc(userId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Data user tidak ditemukan' });
        }

        const userData = userDoc.data();
        res.status(200).json({
            message: 'Berhasil mengambil data dashboard',
            user: {
                name: userData.name,
                email: userData.email,
            },
        });
    } catch (error) {
        res.status(500).json({ message: `Error: ${error.message}` });
    }
};


//Change Password
const ChangePassword = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Anda harus login terlebih dahulu' });
    }

    const userId = req.session.user.id;

    const { passwordBaru } = req.body;

    if (!passwordBaru) {
        return res.status(400).json({ message: 'Password baru harus diisi' });
    }

    try {
        const hashedPassword = await bcrypt.hash(passwordBaru, 10);

        await admin.auth().updateUser(userId, {
            password: passwordBaru,
        });

        await admin.firestore().collection('User').doc(userId).update({
            password: hashedPassword,
        });

        res.status(200).json({ message: 'Password berhasil diganti' });
    } catch (error) {
        res.status(500).json({ message: `Error: ${error.message}` });
    }
};



// Ganti Data (Nama atau Email)
const changeData = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Anda harus login terlebih dahulu' });
    }

    const userId = req.session.user.id;

    const { name, email } = req.body;

    try {
        // Ambil data user dari Firestore
        const userDoc = await admin.firestore().collection('User').doc(userId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Data user tidak ditemukan' });
        }

        const userData = userDoc.data();

        const updatedData = {};
        if (name && name !== userData.name) {
            updatedData.name = name;
        }
        if (email && email !== userData.email) {
            updatedData.email = email;
        }

        if (Object.keys(updatedData).length === 0) {
            return res.status(400).json({ message: 'Tidak ada perubahan data' });
        }

        await admin.firestore().collection('User').doc(userId).update(updatedData);

        if (email && email !== userData.email) {
            await admin.auth().updateUser(userId, { email });
        }

        // Update sesi dengan data baru
        req.session.user = {
            ...req.session.user,
            ...updatedData,
        };

        res.status(200).json({
            message: 'Data berhasil diperbarui',
            updatedData: req.session.user,
        });
    } catch (error) {
        res.status(500).json({ message: `Error: ${error.message}` });
    }
};



module.exports = { register, login, logout, dashboard, ChangePassword, changeData };
