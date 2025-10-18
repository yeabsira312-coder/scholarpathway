# ScholarPathway Deployment Guide

## Overview
ScholarPathway is a scholarship and study abroad blog platform built with Node.js, Express, and Supabase.

## Prerequisites
- Node.js 20+ 
- Supabase account and project
- Render.com account (for deployment)

## Local Development Setup

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials:
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

3. **Initialize database:**
   ```bash
   npm run seed
   ```

4. **Start development server:**
   ```bash
   npm start
   ```

## Render.com Deployment

### 1. Create Render Service
1. Connect your GitHub repository to Render
2. Choose "Web Service"
3. Configure the service:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

### 2. Environment Variables
Set these in your Render dashboard under "Environment":

#### Required Variables:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### Optional Configuration:
```
NODE_ENV=production
SITE_NAME=ScholarPathway
SITE_URL=https://your-app.onrender.com
SESSION_SECRET=random_string_here_min_32_chars
```

#### Analytics (Optional):
```
GA_MEASUREMENT_ID=G-XXXXXXXXXX
ADSENSE_CLIENT=ca-pub-xxxxxxxxxx
```

#### External Policy Links (Optional):
If you want policy pages to redirect to external sites:
```
HELP_URL=https://your-external-help-site.com
PRIVACY_URL=https://your-external-privacy-policy.com  
TERMS_URL=https://your-external-terms-of-service.com
```

**Note:** If these URLs are not set, the site will display built-in policy pages instead.

### 3. Supabase Setup
1. Create a new Supabase project
2. Go to Project Settings → API
3. Copy the Project URL and service_role key
4. Run the seed script to populate initial data:
   ```bash
   npm run seed
   ```

## Features

### Policy Pages
- **Built-in Pages**: Comprehensive privacy policy, terms of service, and help center
- **External Redirects**: Option to redirect to external policy sites via environment variables
- **Automatic Fallback**: Shows built-in pages if external URLs not configured

### Error Handling
- Custom 404 and 500 error pages
- Proper error logging and user feedback
- Graceful fallbacks for missing data

### SEO & Performance
- Server-side rendering with EJS templates
- Automatic sitemap and robots.txt generation
- RSS feed support
- Optimized static asset caching

## Troubleshooting

### Common Issues:

1. **Server won't start**: Check that all required environment variables are set
2. **Database errors**: Verify Supabase URL and keys are correct
3. **404 errors**: Ensure all routes are properly configured
4. **Policy pages not working**: Check if external URLs are set or use built-in pages

### Logs:
Check Render logs for detailed error information:
- Go to your service dashboard on Render
- Click "Logs" to view real-time application logs

## Architecture

```
scholarpathway/
├── config/          # Database and service configurations
├── controllers/     # Route handlers and business logic
├── middleware/      # Authentication and security middleware
├── routes/          # Express route definitions
├── views/           # EJS templates
├── utils/           # Helper functions and utilities
├── tools/           # Database seeding and maintenance scripts
└── server.js        # Main application entry point
```

## Support
For deployment issues, check:
1. Environment variable configuration
2. Supabase connection settings
3. Render service logs
4. Network connectivity and firewall settings