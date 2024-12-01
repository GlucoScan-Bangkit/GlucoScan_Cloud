const express = require('express');
const handler = require('./handler');
const multer = require('multer');
const router = express.Router();
const upload = multer();

// Middleware for session check
// const isLoggedIn = (req, res, next) => {
//     if (req.session.user) {
//         return res.redirect('/dashboard');
//     }
//     next();
// };

// const isNotLoggedIn = (req, res, next) => {
//     if (!req.session.user) {
//         return res.redirect('/login');
//     }
//     next();
// };

// Routes
router.post('/register', handler.register);
router.post('/login', handler.login);
router.post('/logout', handler.logout);
router.get('/dashboard', handler.dashboard);
router.patch('/dashboard/ChangePassword', handler.ChangePassword);
router.patch('/dashboard/gantiData', handler.changeData);
router.patch(
    '/dashboard/changeProfilePicture',
    handler.upload.single('pictureProfile'), // middleware upload
    handler.changeProfilePicture
);

module.exports = router;
