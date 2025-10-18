# ScholarPathway - Professional Render Deployment Guide

## 🚀 **Production-Ready Deployment**

This guide will help you deploy ScholarPathway to Render with all professional features enabled, including the new policy pages and external redirect system.

## 📋 **Prerequisites**

- Supabase account with a project set up
- Render account (free or paid)
- Domain/subdomain for your site (optional)
- External policy page URLs (optional)

## 🏗️ **Render Setup**

### 1. **Create New Web Service**

1. **Connect Repository**: Link your GitHub repository to Render
2. **Select Branch**: Usually `main` or `master`
3. **Configure Service**:
   - **Name**: `scholarpathway` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` or `Starter` (recommended for production)

### 2. **Required Environment Variables**

Set these in Render Dashboard → Your Service → Environment:

```bash
# REQUIRED - Database Connection
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# REQUIRED - Security
SESSION_SECRET=your_random_32_plus_character_secret_here
NODE_ENV=production

# REQUIRED - Site Configuration  
SITE_NAME=ScholarPathway
SITE_URL=https://your-render-app.onrender.com
```

### 3. **Optional Environment Variables**

```bash
# Analytics & Monetization
GA_MEASUREMENT_ID=G-XXXXXXXXXX
ADSENSE_CLIENT=ca-pub-xxxxxxxxxx

# Email Services (for contact forms & newsletters)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

# External Policy Links (redirect footer/menu to external sites)
HELP_URL=https://your-help-center.com
PRIVACY_URL=https://your-privacy-policy-site.com
TERMS_URL=https://your-terms-of-service-site.com
```

### 4. **Custom Domain (Optional)**

1. Go to Settings → Custom Domains
2. Add your domain (e.g., `scholarpathway.com`)
3. Update DNS records as instructed
4. Update `SITE_URL` environment variable to match

## 📄 **Policy Pages Behavior**

### **Smart Redirect System**

- **With External URLs Set**: Pages redirect with 301 to your external policy sites
- **Without External URLs**: Beautiful built-in pages are served locally

### **Built-in Pages Include**:
- ✅ **Comprehensive Privacy Policy** with GDPR compliance
- ✅ **Professional Terms of Service** with liability protections
- ✅ **Complete Help Center** with FAQ and troubleshooting

### **Professional Features**:
- Mobile-responsive design
- SEO-optimized with proper meta tags
- Consistent branding with your site colors (#0055FF)
- Professional legal language
- Interactive elements (accordions, cards, etc.)

## 🎨 **Customization Guide**

### **Branding Colors**
The pages use your existing brand color system:
- Primary: `#0055FF` (ScholarPathway blue)
- Font: Poppins (already loaded)
- Bootstrap 5 components for consistency

### **Content Updates**
To customize the policy content:
1. Edit `views/pages/privacy.ejs`
2. Edit `views/pages/terms.ejs` 
3. Edit `views/pages/help.ejs`
4. Redeploy to Render

## 🔧 **Supabase Configuration**

### **Required Tables**
Make sure your Supabase project has these tables:
- `scholarships`
- `posts`
- `countries`
- `subscribers` (for newsletter)

### **Database Seed**
Run the seeder to populate initial data:
```bash
npm run seed
```

## 🚦 **Deployment Process**

1. **Push Changes**: Commit and push to your connected branch
2. **Auto Deploy**: Render automatically builds and deploys
3. **Check Status**: Monitor deployment in Render dashboard
4. **Test Environment Variables**: Verify all settings in Environment tab
5. **Domain Setup**: Configure custom domain if needed

## ✅ **Post-Deployment Checklist**

### **Essential Tests**
- [ ] Site loads at your Render URL
- [ ] All navigation links work
- [ ] Search functionality operational
- [ ] Newsletter signup works
- [ ] Contact form submits successfully

### **Policy Pages Tests**
- [ ] `/privacy` loads (redirect or local page)
- [ ] `/terms` loads (redirect or local page)  
- [ ] `/help` loads (redirect or local page)
- [ ] Footer links point to correct destinations
- [ ] Mobile responsiveness verified

### **SEO & Performance**
- [ ] Page titles and meta descriptions display correctly
- [ ] Google Analytics tracking (if configured)
- [ ] Site speed acceptable (< 3 seconds)
- [ ] No console errors in browser

## 🔍 **Troubleshooting**

### **Common Issues**

**1. Site Won't Load**
- Check build logs in Render dashboard
- Verify all required environment variables are set
- Ensure Supabase URLs and keys are correct

**2. Policy Pages Show 404**
- Verify routes are correctly configured in `routes/public.js`
- Check if external URLs (if set) are valid and accessible
- Clear browser cache and test again

**3. Database Connection Issues**
- Double-check Supabase URL and service role key
- Ensure Supabase project is not paused
- Check network settings in Supabase dashboard

**4. Newsletter/Forms Not Working**
- Verify email service configuration (Resend API key)
- Check CSRF token configuration
- Test with browser developer tools open

### **Getting Help**

1. **Render Logs**: Check deployment and runtime logs in Render dashboard
2. **Environment Check**: Verify all environment variables are set correctly  
3. **Database Status**: Ensure Supabase project is active and accessible
4. **DNS Issues**: If using custom domain, verify DNS propagation

## 📈 **Production Monitoring**

### **Key Metrics to Watch**
- Response times
- Error rates
- Database connection health
- Newsletter signup conversion
- User engagement on policy pages

### **Render Monitoring**
- Use Render's built-in monitoring
- Set up alerts for downtime
- Monitor resource usage

## 🔐 **Security Best Practices**

- ✅ Strong session secrets (32+ characters)
- ✅ HTTPS enabled by default on Render
- ✅ CSRF protection enabled
- ✅ Input sanitization implemented
- ✅ Rate limiting on forms
- ✅ Secure headers configured

## 📞 **Support**

For deployment issues:
1. Check this guide first
2. Review Render documentation
3. Check Supabase status page
4. Contact support through appropriate channels

---

**Your ScholarPathway site is now production-ready with professional policy pages! 🎉**