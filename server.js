// =============================
//  Core and third-party imports
// =============================
import { createClient } from '@supabase/supabase-js';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieSession from 'cookie-session';
import csrf from 'csurf';
import methodOverride from 'method-override';

// =============================
//  Local imports (routes)
// =============================
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

// =============================
//  ESM dirname fix
// =============================
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
//  Supabase setup
// =============================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// =============================
//  Express app setup
// =============================
const app = express();
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// =============================
//  Middleware
// =============================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://www.googletagmanager.com",
        "https://pagead2.googlesyndication.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https://i.imgur.com",
        "https://images.unsplash.com",
        "https://pagead2.googlesyndication.com",
        "https://www.google-analytics.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "https://googleads.g.doubleclick.net"]
    }
  }
}));
app.use(morgan('combined'));

// =============================
//  Sessions & CSRF protection
// =============================
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

// =============================
//  Static files
// =============================
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// =============================
//  Routes
// =============================
app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// =============================
//  Error pages
// =============================
app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Page Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('pages/500', { title: 'Server Error' });
});

// =============================
//  Start the server
// =============================
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ ScholarPathway running on port ${port}`));
