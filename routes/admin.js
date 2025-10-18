// routes/admin.js (ESM)
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// requireAuth middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) return res.redirect('/admin/login');
  next();
}

router.get('/login', (req, res) => {
  res.render('pages/admin/login', { title: 'Admin Login' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: user, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.render('pages/admin/login', { title: 'Admin Login', error: 'Invalid email or password' });
    }

    // if password stored hashed:
    const passwordMatches = user.password && bcrypt.compareSync(password, user.password);
    if (!(user.password ? passwordMatches : password === user.password)) {
      return res.render('pages/admin/login', { title: 'Admin Login', error: 'Invalid email or password' });
    }

    req.session.user = { id: user.id, email: user.email };
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
});

router.get('/dashboard', requireAuth, async (req, res) => {
  res.render('pages/admin/dashboard', { title: 'Dashboard', user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/admin/login');
});

export default router;
