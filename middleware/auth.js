function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/admin/login');
  }
  
  res.locals.user = req.session.user;
  next();
}

function redirectIfAuth(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/admin');
  }
  next();
}

module.exports = {
  requireAuth,
  redirectIfAuth
};