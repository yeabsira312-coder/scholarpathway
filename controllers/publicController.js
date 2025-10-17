const { supabase } = require('../config/supabase');
const { validationResult } = require('express-validator');
const { clean } = require('../utils/sanitize');
const { getPagination } = require('../utils/pagination');
const dayjs = require('dayjs');

// Home page
exports.home = async (req, res) => {
  try {
    // Get featured scholarships
    const { data: scholarships, error: scholarshipsError } = await supabase
      .from('scholarships')
      .select(`
        id, slug, title, country_code, degree_levels, deadline, summary, tags, featured,
        countries(name)
      `)
      .eq('is_published', true)
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(6);

    if (scholarshipsError) throw scholarshipsError;

    // Get countries with scholarship counts
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select(`
        code, name,
        scholarships!inner(id)
      `)
      .limit(12);

    if (countriesError) throw countriesError;

    // Process countries with counts
    const countriesWithCounts = countries.map(country => ({
      ...country,
      count: country.scholarships ? country.scholarships.length : 0,
      flag: getCountryFlag(country.code)
    }));

    res.render('pages/home', {
      title: 'Find Your Perfect Scholarship - ScholarPathway',
      description: 'Discover scholarships and study abroad opportunities worldwide. Search thousands of scholarships for students.',
      scholarships: scholarships || [],
      countries: countriesWithCounts || [],
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Home page error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// Scholarships listing
exports.scholarships = async (req, res) => {
  try {
    const { q, country, degree, deadlineBefore, page = 1 } = req.query;
    const { offset, limit } = getPagination(page, 12);

    let query = supabase
      .from('scholarships')
      .select(`
        id, slug, title, country_code, degree_levels, deadline, summary, tags, featured,
        countries(name)
      `)
      .eq('is_published', true);

    // Apply filters
    if (q && q.trim()) {
      // Try full-text search first, fallback to ILIKE
      const { data: ftsResults, error: ftsError } = await supabase
        .from('scholarships')
        .select(`
          id, slug, title, country_code, degree_levels, deadline, summary, tags, featured,
          countries(name)
        `)
        .eq('is_published', true)
        .textSearch('search_vector', q.trim(), { type: 'websearch' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!ftsError && ftsResults && ftsResults.length > 0) {
        query = supabase
          .from('scholarships')
          .select(`
            id, slug, title, country_code, degree_levels, deadline, summary, tags, featured,
            countries(name)
          `)
          .eq('is_published', true)
          .textSearch('search_vector', q.trim(), { type: 'websearch' });
      } else {
        // Fallback to ILIKE search
        query = query.or(`title.ilike.%${q.trim()}%,summary.ilike.%${q.trim()}%,eligibility.ilike.%${q.trim()}%`);
      }
    }

    if (country) {
      query = query.eq('country_code', country.toUpperCase());
    }

    if (degree) {
      query = query.contains('degree_levels', [degree]);
    }

    if (deadlineBefore) {
      query = query.lte('deadline', deadlineBefore);
    }

    // Get total count
    const countQuery = supabase
      .from('scholarships')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    if (q && q.trim()) {
      countQuery.textSearch('search_vector', q.trim(), { type: 'websearch' });
    }
    if (country) countQuery.eq('country_code', country.toUpperCase());
    if (degree) countQuery.contains('degree_levels', [degree]);
    if (deadlineBefore) countQuery.lte('deadline', deadlineBefore);

    const [scholarshipsResult, countResult] = await Promise.all([
      query
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      countQuery
    ]);

    if (scholarshipsResult.error) throw scholarshipsResult.error;
    if (countResult.error) throw countResult.error;

    const totalCount = countResult.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get countries for filter dropdown
    const { data: countries } = await supabase
      .from('countries')
      .select('code, name')
      .order('name');

    res.render('pages/scholarships', {
      title: q ? `Search Results for "${q}"` : 'Scholarships - ScholarPathway',
      description: 'Browse scholarships and study abroad opportunities by country, degree level, and deadline.',
      scholarships: scholarshipsResult.data || [],
      countries: countries || [],
      filters: { q, country, degree, deadlineBefore },
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Scholarships page error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// Scholarship detail page
exports.scholarshipDetail = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: scholarship, error } = await supabase
      .from('scholarships')
      .select(`
        *, countries(name)
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !scholarship) {
      return res.status(404).render('pages/404', { title: 'Scholarship Not Found' });
    }

    // Get related scholarships by country or tags
    const { data: related } = await supabase
      .from('scholarships')
      .select(`
        id, slug, title, country_code, degree_levels, deadline, summary, tags,
        countries(name)
      `)
      .eq('is_published', true)
      .neq('id', scholarship.id)
      .or(`country_code.eq.${scholarship.country_code},tags.cs.{${scholarship.tags.join(',')}}`)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4);

    const canonicalUrl = `${process.env.SITE_URL || ''}/scholarships/${slug}`;

    res.render('pages/scholarship-detail', {
      title: `${scholarship.title} - ScholarPathway`,
      description: scholarship.summary,
      scholarship,
      related: related || [],
      canonicalUrl,
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Scholarship detail error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// Tips/Posts listing
exports.tips = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const { offset, limit } = getPagination(page, 10);

    const [postsResult, countResult] = await Promise.all([
      supabase
        .from('posts')
        .select('id, slug, title, summary, tags, featured, created_at')
        .eq('is_published', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)
    ]);

    if (postsResult.error) throw postsResult.error;
    if (countResult.error) throw countResult.error;

    const totalCount = countResult.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.render('pages/tips', {
      title: 'Study Tips & Guides - ScholarPathway',
      description: 'Get expert tips and guides for studying abroad, scholarship applications, and academic success.',
      posts: postsResult.data || [],
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Tips page error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// Tip/Post detail page
exports.tipDetail = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !post) {
      return res.status(404).render('pages/404', { title: 'Post Not Found' });
    }

    // Get recent posts
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, slug, title, created_at')
      .eq('is_published', true)
      .neq('id', post.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const canonicalUrl = `${process.env.SITE_URL || ''}/tips/${slug}`;

    res.render('pages/tip-detail', {
      title: `${post.title} - ScholarPathway`,
      description: post.summary,
      post,
      recentPosts: recentPosts || [],
      canonicalUrl,
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Tip detail error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// Countries listing
exports.countries = async (req, res) => {
  try {
    const { data: countries, error } = await supabase
      .from('countries')
      .select(`
        code, name,
        scholarships!inner(id)
      `)
      .order('name');

    if (error) throw error;

    const countriesWithCounts = countries.map(country => ({
      ...country,
      count: country.scholarships ? country.scholarships.length : 0,
      flag: getCountryFlag(country.code)
    }));

    res.render('pages/countries', {
      title: 'Study Destinations - ScholarPathway',
      description: 'Explore scholarship opportunities by country. Find the perfect study destination for your academic journey.',
      countries: countriesWithCounts,
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Countries page error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// Countries filter page
exports.countriesFilter = async (req, res) => {
  try {
    const { code } = req.params;
    const { page = 1 } = req.query;
    const { offset, limit } = getPagination(page, 12);

    // Get country info
    const { data: country, error: countryError } = await supabase
      .from('countries')
      .select('code, name')
      .eq('code', code.toUpperCase())
      .single();

    if (countryError || !country) {
      return res.status(404).render('pages/404', { title: 'Country Not Found' });
    }

    // Get scholarships for this country
    const [scholarshipsResult, countResult] = await Promise.all([
      supabase
        .from('scholarships')
        .select(`
          id, slug, title, country_code, degree_levels, deadline, summary, tags, featured,
          countries(name)
        `)
        .eq('country_code', code.toUpperCase())
        .eq('is_published', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from('scholarships')
        .select('*', { count: 'exact', head: true })
        .eq('country_code', code.toUpperCase())
        .eq('is_published', true)
    ]);

    if (scholarshipsResult.error) throw scholarshipsResult.error;
    if (countResult.error) throw countResult.error;

    const totalCount = countResult.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.render('pages/country-scholarships', {
      title: `${country.name} Scholarships - ScholarPathway`,
      description: `Find scholarships and study opportunities in ${country.name}. Comprehensive list of available funding options.`,
      country: {
        ...country,
        flag: getCountryFlag(country.code)
      },
      scholarships: scholarshipsResult.data || [],
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Country filter error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// About page
exports.about = (req, res) => {
  res.render('pages/about', {
    title: 'About ScholarPathway - Your Guide to Global Education',
    description: 'Learn about ScholarPathway\'s mission to help students find scholarships and study abroad opportunities worldwide.',
    currentUrl: req.originalUrl
  });
};

// Contact page
exports.contact = (req, res) => {
  res.render('pages/contact', {
    title: 'Contact Us - ScholarPathway',
    description: 'Get in touch with ScholarPathway. We\'re here to help with your scholarship and study abroad questions.',
    currentUrl: req.originalUrl
  });
};

// Contact form submission
exports.contactSubmit = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('pages/contact', {
        title: 'Contact Us - ScholarPathway',
        description: 'Get in touch with ScholarPathway.',
        errors: errors.array(),
        formData: req.body,
        currentUrl: req.originalUrl
      });
    }

    const { name, email, message } = req.body;

    const { error } = await supabase
      .from('contacts')
      .insert([{
        name: clean(name),
        email: email.toLowerCase().trim(),
        message: clean(message)
      }]);

    if (error) throw error;

    res.render('pages/contact', {
      title: 'Contact Us - ScholarPathway',
      description: 'Get in touch with ScholarPathway.',
      success: 'Thank you for your message! We\'ll get back to you soon.',
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Contact submit error:', error);
    res.render('pages/contact', {
      title: 'Contact Us - ScholarPathway',
      description: 'Get in touch with ScholarPathway.',
      errors: [{ msg: 'Failed to send message. Please try again.' }],
      formData: req.body,
      currentUrl: req.originalUrl
    });
  }
};

// Newsletter subscription
exports.subscribe = async (req, res) => {
  try {
    const { email, source } = req.body;

    if (!email || !email.includes('@')) {
      return res.json({ error: 'Please provide a valid email address' });
    }

    const { error } = await supabase
      .from('subscribers')
      .upsert([{
        email: email.toLowerCase().trim(),
        source: source || 'website'
      }], { onConflict: 'email' });

    if (error && !error.message.includes('duplicate')) {
      throw error;
    }

    res.json({ success: 'Successfully subscribed to newsletter!' });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.json({ error: 'Failed to subscribe. Please try again.' });
  }
};

// Sitemap XML
exports.sitemap = async (req, res) => {
  try {
    const baseUrl = process.env.SITE_URL || 'https://scholarpathway.glitch.me';
    
    const [scholarshipsResult, postsResult, countriesResult] = await Promise.all([
      supabase
        .from('scholarships')
        .select('slug, updated_at')
        .eq('is_published', true),
      supabase
        .from('posts')
        .select('slug, updated_at')
        .eq('is_published', true),
      supabase
        .from('countries')
        .select('code')
    ]);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/scholarships</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/tips</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/countries</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;

    // Add scholarships
    if (scholarshipsResult.data) {
      for (const scholarship of scholarshipsResult.data) {
        xml += `
  <url>
    <loc>${baseUrl}/scholarships/${scholarship.slug}</loc>
    <lastmod>${scholarship.updated_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    // Add posts
    if (postsResult.data) {
      for (const post of postsResult.data) {
        xml += `
  <url>
    <loc>${baseUrl}/tips/${post.slug}</loc>
    <lastmod>${post.updated_at}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    }

    // Add countries
    if (countriesResult.data) {
      for (const country of countriesResult.data) {
        xml += `
  <url>
    <loc>${baseUrl}/countries/${country.code.toLowerCase()}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    }

    xml += '\n</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Error generating sitemap');
  }
};

// Robots.txt
exports.robots = (req, res) => {
  const baseUrl = process.env.SITE_URL || 'https://scholarpathway.glitch.me';
  
  res.set('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`);
};

// RSS Feed
exports.feed = async (req, res) => {
  try {
    const baseUrl = process.env.SITE_URL || 'https://scholarpathway.glitch.me';
    const siteName = process.env.SITE_NAME || 'ScholarPathway';

    const [postsResult, scholarshipsResult] = await Promise.all([
      supabase
        .from('posts')
        .select('slug, title, summary, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('scholarships')
        .select('slug, title, summary, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName}</title>
    <description>Find scholarships and study abroad opportunities worldwide</description>
    <link>${baseUrl}</link>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;

    // Add posts
    if (postsResult.data) {
      for (const post of postsResult.data) {
        xml += `
    <item>
      <title>${escapeXml(post.title)}</title>
      <description>${escapeXml(post.summary)}</description>
      <link>${baseUrl}/tips/${post.slug}</link>
      <guid>${baseUrl}/tips/${post.slug}</guid>
      <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
    </item>`;
      }
    }

    // Add scholarships
    if (scholarshipsResult.data) {
      for (const scholarship of scholarshipsResult.data) {
        xml += `
    <item>
      <title>${escapeXml(scholarship.title)}</title>
      <description>${escapeXml(scholarship.summary)}</description>
      <link>${baseUrl}/scholarships/${scholarship.slug}</link>
      <guid>${baseUrl}/scholarships/${scholarship.slug}</guid>
      <pubDate>${new Date(scholarship.created_at).toUTCString()}</pubDate>
    </item>`;
      }
    }

    xml += `
  </channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml');
    res.send(xml);
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).send('Error generating feed');
  }
};

// Helper functions
function getCountryFlag(countryCode) {
  const flagEmojis = {
    'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺', 'DE': '🇩🇪',
    'FR': '🇫🇷', 'JP': '🇯🇵', 'KR': '🇰🇷', 'CN': '🇨🇳', 'IN': '🇮🇳',
    'BR': '🇧🇷', 'MX': '🇲🇽', 'IT': '🇮🇹', 'ES': '🇪🇸', 'NL': '🇳🇱',
    'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'CH': '🇨🇭'
  };
  return flagEmojis[countryCode] || '🌍';
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}