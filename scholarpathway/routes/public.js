const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const publicController = require('../controllers/publicController');

const router = express.Router();

// Rate limiting for forms
const formRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Public pages
router.get('/', publicController.home);
router.get('/scholarships', publicController.scholarships);
router.get('/scholarships/:slug', publicController.scholarshipDetail);
router.get('/tips', publicController.tips);
router.get('/tips/:slug', publicController.tipDetail);
router.get('/countries', publicController.countries);
router.get('/countries/:code', publicController.countriesFilter);
router.get('/about', publicController.about);
router.get('/contact', publicController.contact);

// Form submissions
router.post('/contact', formRateLimit, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Message must be 10-2000 characters')
], publicController.contactSubmit);
router.post('/subscribe', formRateLimit, publicController.subscribe);

// SEO and feeds
router.get('/sitemap.xml', publicController.sitemap);
router.get('/robots.txt', publicController.robots);
router.get('/feed.xml', publicController.feed);

module.exports = router;