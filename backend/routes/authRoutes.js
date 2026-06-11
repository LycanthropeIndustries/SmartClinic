const express = require('express');
const ctrl = require('../controllers/index.js');

const router = express.Router();

// POST /api/auth/login
// GET  /api/auth/users
router.post('/login', ctrl.login);
router.post('/users', ctrl.createUser);
router.get('/users', ctrl.getUsers);
router.put('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);

module.exports = router;