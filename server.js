const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieSession = require('cookie-session');
const csrf = require('csurf');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// layouts
app.use(expressLayouts);
app.set('layout', 'layouts/layout');

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://www.googletagmanager.com", "https://pagead2.googlesyndication.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://i.imgur.com", "https://images.unsplash.com", "https://pagead2.googlesyndication.com", "https://www.google-analytics.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'", "https://api.resend.com"],
      frameSrc: ["'self'", "https://googleads.g.doubleclick.net"]
    }
  }
}));
app.use(morgan('combined'));

app.use(cookieSession({
  name: 'sp.sid',
  keys: [process.env.SESSION_SECRET || 'dev-secret-change-in-production'],
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000
}));

app.use(csrf({
  value: (req) => {
    // Accept CSRF token from multiple sources: body, query, or headers
    return req.body._csrf || req.query._csrf || req.headers['x-csrf-token'];
  }
}));

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.site = {
    name: process.env.SITE_NAME || 'ScholarPathway',
    url: process.env.SITE_URL || '',
    ga: process.env.GA_MEASUREMENT_ID || '',
    adsenseClient: process.env.ADSENSE_CLIENT || ''
  };
  // Safe defaults for templates
  res.locals.title = null;
  res.locals.description = '';
  res.locals.structuredData = null;
  res.locals.originalUrl = req.originalUrl;
  res.locals.user = req.session && req.session.user;
  next();
});

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// routes
app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Page Not Found' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  
  // Handle CSRF errors specifically
  if (err.code === 'EBADCSRFTOKEN') {
    if (req.headers['x-requested-with'] === 'XMLHttpRequest' || (req.headers.accept || '').includes('application/json')) {
      return res.status(403).json({ 
        error: 'Security validation failed. Please refresh the page and try again.' 
      });
    }
    return res.status(403).render('pages/404', { 
      title: 'Security Error',
      description: 'Invalid security token. Please refresh and try again.'
    });
  }
  
  // Handle other errors
  if (req.headers['x-requested-with'] === 'XMLHttpRequest' || (req.headers.accept || '').includes('application/json')) {
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
  
  res.status(500).render('pages/500', { title: 'Server Error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ScholarPathway listening on ${port}`));
