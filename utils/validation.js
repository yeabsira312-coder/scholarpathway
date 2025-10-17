const { body, validationResult } = require('express-validator');
const { cleanPlainText } = require('./sanitize');

const validators = {
  email: () => body('email').isEmail().normalizeEmail().trim(),
  
  name: () => body('name').trim().isLength({ min: 2, max: 100 }).customSanitizer(cleanPlainText),
  
  title: () => body('title').trim().isLength({ min: 3, max: 200 }).customSanitizer(cleanPlainText),
  
  slug: () => body('slug').optional().trim().isLength({ min: 3, max: 200 }).matches(/^[a-z0-9-]+$/),
  
  summary: () => body('summary').trim().isLength({ min: 10, max: 500 }).customSanitizer(cleanPlainText),
  
  content: () => body('content').trim().isLength({ min: 10 }),
  
  message: () => body('message').trim().isLength({ min: 10, max: 2000 }).customSanitizer(cleanPlainText),
  
  url: () => body('official_link').isURL({ protocols: ['http', 'https'] }),
  
  country: () => body('country_code').isLength({ min: 2, max: 2 }).isAlpha(),
  
  tags: () => body('tags').optional().customSanitizer((value) => {
    if (typeof value === 'string') {
      return value.split(',').map(tag => cleanPlainText(tag.trim())).filter(Boolean);
    }
    return Array.isArray(value) ? value.map(tag => cleanPlainText(tag)).filter(Boolean) : [];
  }),
  
  degreeLevels: () => body('degree_levels').optional().customSanitizer((value) => {
    if (typeof value === 'string') {
      return [value];
    }
    return Array.isArray(value) ? value : [];
  }),
  
  deadline: () => body('deadline').optional().isISO8601().toDate(),
  
  boolean: (field) => body(field).optional().isBoolean().toBoolean()
};

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
    });
  }
  next();
}

module.exports = {
  validators,
  handleValidationErrors
};