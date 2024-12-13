const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = require(process.env.CONFIG);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${process.env.BUCKET_NAME}`,
});

module.exports = admin;