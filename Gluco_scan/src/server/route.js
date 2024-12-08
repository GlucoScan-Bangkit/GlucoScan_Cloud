const express = require('express');
const handler = require('./handler');
const multer = require('multer');
const router = express.Router();
const upload = multer();
const auth = require('../services/auth');

//Auth
router.post('/register', handler.register);
router.post('/login', handler.login);
router.post('/logout', handler.logout);

//Routes
router.get('/dashboard', auth, handler.dashboard);
router.patch('/dashboard/ChangePassword', auth, handler.ChangePassword);
router.patch('/dashboard/gantiData', auth, handler.changeData);
router.patch(
    '/dashboard/changeProfilePicture',
    handler.upload.single('pictureProfile'), // middleware upload
    auth, 
    handler.changeProfilePicture
);

module.exports = router;
