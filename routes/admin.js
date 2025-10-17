const express = require('express');
const { body } = require('express-validator');
const { requireAuth, redirectIfAuth } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Authentication routes (no auth required)
router.get('/login', redirectIfAuth, adminController.loginPage);
router.post('/login', redirectIfAuth, [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], adminController.login);
router.post('/logout', adminController.logout);

// All routes below require authentication
router.use(requireAuth);

// Dashboard
router.get('/', adminController.dashboard);

// Scholarships management
router.get('/scholarships', adminController.scholarshipsList);
router.get('/scholarships/new', adminController.scholarshipsNew);
router.post('/scholarships', adminController.scholarshipsCreate);
router.get('/scholarships/:id/edit', adminController.scholarshipsEdit);
router.post('/scholarships/:id/update', adminController.scholarshipsUpdate);
router.post('/scholarships/:id/delete', adminController.scholarshipsDelete);

// Posts management
router.get('/posts', adminController.postsList);
router.get('/posts/new', adminController.postsNew);
router.post('/posts', adminController.postsCreate);
router.get('/posts/:id/edit', adminController.postsEdit);
router.post('/posts/:id/update', adminController.postsUpdate);
router.post('/posts/:id/delete', adminController.postsDelete);

// Countries management
router.get('/countries', adminController.countriesList);
router.post('/countries', adminController.countriesUpsert);
router.post('/countries/:code/delete', adminController.countriesDelete);

module.exports = router;