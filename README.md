 HEAD
# ScholarPathway - Scholarship & Study Abroad Blog

A dynamic, database-driven scholarship discovery platform built for Glitch deployment.

## 🌟 Features

- **Dynamic Content Management**: Full CRUD for scholarships and blog posts
- **Advanced Search**: Full-text search with filters by country, degree level, deadline
- **SEO Optimized**: Structured data, sitemap, meta tags, and clean URLs
- **Responsive Design**: Mobile-first Bootstrap 5 with Poppins typography
- **Secure Authentication**: Admin panel with secure session management
- **Monetization Ready**: AdSense placeholders and affiliate link sections
- **Performance Optimized**: Compression, caching, and security headers

## 🚀 Quick Deployment on Glitch

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Navigate to SQL Editor and run the complete schema:

```sql
-- Extensions
create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists citext;
create extension if not exists pg_trgm;

-- Countries
create table if not exists public.countries (
  code char(2) primary key,
  name text not null,
  created_at timestamptz not null default now()
);

-- Scholarships
create table if not exists public.scholarships (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  country_code char(2) not null references public.countries(code) on update cascade on delete restrict,
  degree_levels text[] not null default array[]::text[],
  deadline date null,
  summary text not null,
  eligibility text not null,
  benefits text not null,
  how_to_apply text not null,
  official_link text not null,
  tags text[] not null default array[]::text[],
  featured boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector
);

alter table public.scholarships
  add constraint official_link_http check (official_link ~* '^https?://');

-- Posts (Tips and Guides)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  content text not null,
  tags text[] not null default array[]::text[],
  featured boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector
);

-- Newsletter subscribers
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  created_at timestamptz not null default now(),
  confirmed boolean not null default false,
  source text null
);

-- Contact form submissions
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email citext not null,
  message text not null,
  created_at timestamptz not null default now(),
  processed boolean not null default false
);

create index if not exists contacts_created_idx on public.contacts (created_at desc);

-- Admin users (server-only usage)
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  password_hash text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  last_login_at timestamptz null
);

-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger if not exists set_scholarships_updated_at
before update on public.scholarships
for each row execute function public.set_updated_at();

create trigger if not exists set_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

-- FTS tsvector triggers
create or replace function public.scholarships_tsv_update()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', unaccent(coalesce(new.summary, ''))), 'B') ||
    setweight(to_tsvector('english', unaccent(coalesce(new.eligibility, ''))), 'C') ||
    setweight(to_tsvector('english', unaccent(coalesce(new.benefits, ''))), 'C');
  return new;
end;
$$ language plpgsql;

create trigger if not exists scholarships_tsvector_update
before insert or update on public.scholarships
for each row execute function public.scholarships_tsv_update();

create or replace function public.posts_tsv_update()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', unaccent(coalesce(new.summary, ''))), 'B') ||
    setweight(to_tsvector('english', unaccent(coalesce(new.content, ''))), 'C');
  return new;
end;
$$ language plpgsql;

create trigger if not exists posts_tsvector_update
before insert or update on public.posts
for each row execute function public.posts_tsv_update();

-- Indexes
create index if not exists scholarships_country_idx on public.scholarships (country_code);
create index if not exists scholarships_deadline_idx on public.scholarships (deadline);
create index if not exists scholarships_created_idx on public.scholarships (created_at desc);
create index if not exists scholarships_degree_levels_gin on public.scholarships using gin (degree_levels);
create index if not exists scholarships_tags_gin on public.scholarships using gin (tags);
create index if not exists scholarships_search_gin on public.scholarships using gin (search_vector);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_tags_gin on public.posts using gin (tags);
create index if not exists posts_search_gin on public.posts using gin (search_vector);

-- Enable RLS (service role will bypass)
alter table public.countries enable row level security;
alter table public.scholarships enable row level security;
alter table public.posts enable row level security;
alter table public.subscribers enable row level security;
alter table public.contacts enable row level security;
alter table public.admin_users enable row level security;
```

3. Copy your **Project URL** and **Service Role Key** from Settings > API

### 2. Deploy to Glitch

1. Go to [glitch.com](https://glitch.com) and create a new Node.js app
2. Upload or paste all project files into your Glitch app
3. Go to **Tools → Secrets** and add these environment variables:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SESSION_SECRET=a_long_random_string_for_sessions
SITE_NAME=ScholarPathway
SITE_URL=https://your-glitch-app.glitch.me
ADMIN_BOOTSTRAP_EMAIL=your_admin_email@example.com
ADMIN_BOOTSTRAP_PASSWORD=your_strong_admin_password
NODE_ENV=production
```

4. In **Tools → Console**, run:
```bash
npm install
npm run seed
```

5. Your app should auto-start! Visit your Glitch URL to see the site

### 3. Admin Access

- Visit `/admin` to access the admin panel
- Login with the email/password you set in the environment variables
- Add scholarships, blog posts, and manage the site content

## 📁 Project Structure

```
scholarpathway/
├── package.json          # Dependencies and scripts
├── server.js             # Express server with security
├── config/
│   └── supabase.js       # Database client configuration
├── controllers/
│   ├── publicController.js  # Public pages logic
│   └── adminController.js   # Admin CRUD operations
├── middleware/
│   └── auth.js           # Authentication middleware
├── routes/
│   ├── public.js         # Public routes
│   └── admin.js          # Admin routes
├── utils/
│   ├── slug.js           # URL slug generation
│   ├── pagination.js     # Pagination helpers
│   ├── validation.js     # Form validation
│   └── sanitize.js       # HTML sanitization
├── public/
│   ├── css/main.css      # Custom styles
│   └── js/main.js        # Client-side JavaScript
├── views/               # EJS templates (needs creation)
│   ├── layouts/
│   ├── partials/
│   └── pages/
└── tools/
    └── seed.js          # Database seeding script
```

## 🎨 Design & Branding

- **Primary Color**: #0055FF (ScholarPathway Blue)
- **Typography**: Poppins from Google Fonts
- **Framework**: Bootstrap 5 with custom overrides
- **Responsive**: Mobile-first design approach

## 🔒 Security Features

- Helmet.js for security headers
- CSRF protection on all forms
- Input validation and sanitization
- Rate limiting on forms
- Secure session management
- SQL injection protection via Supabase

## 💰 Monetization Ready

- AdSense placeholder blocks
- Affiliate link sections
- Newsletter collection
- Contact form for partnerships

## ⚡ Performance

- Gzip compression
- Static asset caching
- Database query optimization
- CDN-hosted dependencies

## 🚀 Going Live

1. **Custom Domain**: Change Glitch project name to get `scholarpathway.glitch.me`
2. **Analytics**: Add `GA_MEASUREMENT_ID` to Secrets when ready
3. **AdSense**: Add `ADSENSE_CLIENT` when approved
4. **SEO**: Submit sitemap at `/sitemap.xml` to Google Search Console

## 📧 Support

For questions about this codebase or deployment issues, create an issue or contact the development team.

---

**Built with ❤️ for students worldwide seeking educational opportunities**

# scholarpathway
ScholarPathway website project
 a699c0a7558ff4263ccb87410f0ba919f3c313c7
