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
router.post('/subscribe', formRateLimit, [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address')
], publicController.subscribe);

// SEO and feeds
router.get('/sitemap.xml', publicController.sitemap);
router.get('/robots.txt', publicController.robots);
router.get('/feed.xml', publicController.feed);
// Embedded chatbot API (lightweight fallback)
router.post('/api/chat', publicController.chatApi);

// Footer links -> external URLs via env; fallback to static pages
router.get('/help', (req, res) => {
  const url = process.env.HELP_URL;
  if (url) {
    return res.redirect(301, url);
  }
  // Fallback to local help page
  res.render('pages/help', { 
    title: 'Help Center',
    description: 'Get help with scholarships and using ScholarPathway'
  });
});

router.get('/privacy', (req, res) => {
  const url = process.env.PRIVACY_URL;
  if (url) {
    return res.redirect(301, url);
  }
  // Fallback to local privacy page
  res.render('pages/privacy', { 
    title: 'Privacy Policy',
    description: 'Our privacy policy and data handling practices'
  });
});

router.get('/terms', (req, res) => {
  const url = process.env.TERMS_URL;
  if (url) {
    return res.redirect(301, url);
  }
  // Fallback to local terms page
  res.render('pages/terms', { 
    title: 'Terms of Service',
    description: 'Terms and conditions for using ScholarPathway'
  });
});

module.exports = router;
