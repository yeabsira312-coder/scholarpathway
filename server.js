// Supabase setup
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Core modules
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieSession = require('cookie-session');
const csrf = require('csurf');
const methodOverride = require('method-override');

// Routes
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Security & performance
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
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "https://googleads.g.doubleclick.net"]
    }
  }
}));

app.use(morgan('combined'));

// Session & CSRF
app.use(cookieSession({
  name: 'sp.sid',
  keys: [process.env.SESSION_SECRET || 'dev-secret-change-in-production'],
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000
}));

app.use(csrf());

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.site = {
    name: process.env.SITE_NAME || 'ScholarPathway',
    url: process.env.SITE_URL || '',
    ga: process.env.GA_MEASUREMENT_ID || '',
    adsenseClient: process.env.ADSENSE_CLIENT || ''
  };
  res.locals.user = req.session && req.session.user;
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// Routes
app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Page Not Found' });
});

// 500
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('pages/500', { title: 'Server Error' });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ScholarPathway listening on ${port}`));
