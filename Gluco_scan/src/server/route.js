const express = require('express');
const handler = require('./handler');
const router = express.Router();

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


module.exports = router;
