const { supabase, isConfigured } = require('../config/supabase');
const { validationResult } = require('express-validator');
const { clean } = require('../utils/sanitize');
const { getPagination } = require('../utils/pagination');
const dayjs = require('dayjs');
const { sendEmail } = require('../utils/email');
const { countriesList } = require('../utils/countries');
// Load database with error handling
let scholarshipsDatabase, studyTipsDatabase;
try {
  const dbData = require('../data/scholarships-database');
  scholarshipsDatabase = dbData.scholarshipsDatabase || [];
  studyTipsDatabase = dbData.studyTipsDatabase || [];
  console.log(`✅ Loaded ${scholarshipsDatabase.length} scholarships and ${studyTipsDatabase.length} tips`);
} catch (error) {
  console.error('⚠️  Database loading error:', error.message);
  scholarshipsDatabase = [];
  studyTipsDatabase = [];
}

// Use comprehensive scholarship database as fallback
const sampleScholarships = scholarshipsDatabase;

// Use comprehensive study tips database as fallback
const samplePosts = studyTipsDatabase;

// Generate countries with real scholarship counts from mega database (only countries with scholarships)
const sampleCountries = countriesList.slice(0, 25).map((country) => {
  const scholarshipsForCountry = sampleScholarships.filter(s => s.country_code === country.code);
  return {
    code: country.code,
    name: country.name,
    scholarships: scholarshipsForCountry,
    scholarship_count: scholarshipsForCountry.length || 0,
    count: scholarshipsForCountry.length || 0,
    flag: getCountryFlag(country.code)
  };
}).filter(country => country.count > 0); // Only show countries with scholarships

// Helper function to get country flag emoji
function getCountryFlag(countryCode) {
  const flagMap = {
    'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺', 'DE': '🇩🇪',
    'FR': '🇫🇷', 'JP': '🇯🇵', 'KR': '🇰🇷', 'CN': '🇨🇳', 'IN': '🇮🇳',
    'BR': '🇧🇷', 'MX': '🇲🇽', 'ES': '🇪🇸', 'IT': '🇮🇹', 'NL': '🇳🇱',
    'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'CH': '🇨🇭', 'AT': '🇦🇹',
    'BE': '🇧🇪', 'FI': '🇫🇮', 'IE': '🇮🇪', 'PT': '🇵🇹', 'GR': '🇬🇷',
    'SG': '🇸🇬', 'HK': '🇭🇰', 'TW': '🇹🇼', 'TH': '🇹🇭', 'MY': '🇲🇾',
    'ID': '🇮🇩', 'PH': '🇵🇭', 'VN': '🇻🇳', 'ZA': '🇿🇦', 'EG': '🇪🇬'
  };
  return flagMap[countryCode] || '🏴';
}

// Home page with robust error handling and fallback data
exports.home = async (req, res) => {
  try {
    let featuredScholarships = sampleScholarships.filter(s => s.featured).slice(0, 6);
    let countriesWithCounts = sampleCountries.slice(0, 12);
    let latestPosts = samplePosts.slice(0, 3);

    // Try to fetch real data if Supabase is configured
    if (isConfigured && supabase) {
      try {
        // Get featured scholarships
        const { data: scholarships } = await supabase
          .from('scholarships')
          .select(`
            id, slug, title, country_code, degree_levels, deadline, summary, tags, featured, amount,
            countries(name)
          `)
          .eq('is_published', true)
          .eq('featured', true)
          .order('created_at', { ascending: false })
          .limit(6);

        if (scholarships && scholarships.length > 0) {
          featuredScholarships = scholarships;
        }

        // Get countries with scholarship counts
        const { data: countries } = await supabase
          .from('countries')
          .select(`
            code, name,
            scholarships!inner(id)
          `)
          .limit(12);

        if (countries && countries.length > 0) {
          countriesWithCounts = countries.map(country => ({
            ...country,
            count: country.scholarships ? country.scholarships.length : 0,
            flag: getCountryFlag(country.code)
          }));
        }

        // Get latest posts
        const { data: posts } = await supabase
          .from('posts')
          .select('id, slug, title, summary, tags, featured, created_at')
          .eq('is_published', true)
          .order('featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(3);

        if (posts && posts.length > 0) {
          latestPosts = posts;
        }
      } catch (dbError) {
        console.warn('⚠️  Database query failed, using fallback data:', dbError.message);
      }
    }

    res.render('pages/home', {
      title: 'Find Your Perfect Scholarship - ScholarPathway',
      description: 'Discover scholarships and study abroad opportunities worldwide. Search thousands of scholarships for students.',
      featuredScholarships,
      countries: countriesWithCounts,
      latestPosts,
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('❌ Home page error:', error);
    // Even if everything fails, still render with minimal data
    res.render('pages/home', {
      title: 'Find Your Perfect Scholarship - ScholarPathway',
      description: 'Discover scholarships and study abroad opportunities worldwide.',
      featuredScholarships: sampleScholarships.slice(0, 3),
      countries: sampleCountries.slice(0, 8),
      latestPosts: samplePosts.slice(0, 2),
      currentUrl: req.originalUrl
    });
  }
};

// Scholarships listing with robust error handling and search
exports.scholarships = async (req, res) => {
  try {
    const { q, country, degree, deadlineBefore, page = 1 } = req.query;
    const paginationData = getPagination(page, 12);
    const { offset } = paginationData;
    const limit = paginationData.pageSize;
    
    let scholarships = [...sampleScholarships];
    let totalCount = sampleScholarships.length;
    // Get unique countries from scholarships for filter dropdown
    const uniqueCountryCodes = [...new Set(sampleScholarships.map(s => s.country_code))];
    let countries = countriesList
      .filter(c => uniqueCountryCodes.includes(c.code))
      .slice(0, 30)
      .map(c => ({ code: c.code, name: c.name }));

    // Try to fetch real data if Supabase is configured
    if (isConfigured && supabase) {
      try {
        let query = supabase
          .from('scholarships')
          .select(`
            id, slug, title, country_code, degree_levels, deadline, summary, tags, featured, amount,
            countries(name)
          `)
          .eq('is_published', true);

        // Apply filters
        if (q && q.trim()) {
          const term = q.trim().replace(/%/g, '').toLowerCase();
          query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%,tags.cs.{${term}}`);
        }

        if (country && country.trim()) {
          query = query.eq('country_code', country.toUpperCase());
        }

        if (degree && degree.trim()) {
          query = query.contains('degree_levels', [degree]);
        }

        if (deadlineBefore) {
          query = query.lte('deadline', deadlineBefore);
        }

        // Get total count first
        let countQuery = supabase
          .from('scholarships')
          .select('*', { count: 'exact', head: true })
          .eq('is_published', true);

        if (q && q.trim()) {
          const term = q.trim().replace(/%/g, '').toLowerCase();
          countQuery = countQuery.or(`title.ilike.%${term}%,summary.ilike.%${term}%,tags.cs.{${term}}`);
        }
        if (country && country.trim()) countQuery = countQuery.eq('country_code', country.toUpperCase());
        if (degree && degree.trim()) countQuery = countQuery.contains('degree_levels', [degree]);
        if (deadlineBefore) countQuery = countQuery.lte('deadline', deadlineBefore);

        const [scholarshipsResult, countResult] = await Promise.all([
          query
            .order('featured', { ascending: false })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
          countQuery
        ]);

        if (scholarshipsResult.data && scholarshipsResult.data.length >= 0) {
          scholarships = scholarshipsResult.data;
          totalCount = countResult.count || 0;
        }

        // Get countries for filter
        const { data: countriesData } = await supabase
          .from('countries')
          .select('code, name')
          .order('name')
          .limit(50);

        if (countriesData && countriesData.length > 0) {
          countries = countriesData;
        }
      } catch (dbError) {
        console.warn('⚠️  Scholarships database query failed, using fallback data:', dbError.message);
        // Apply client-side filtering to sample data if database fails
        if (q && q.trim()) {
          const term = q.trim().toLowerCase();
          scholarships = sampleScholarships.filter(s => 
            s.title.toLowerCase().includes(term) || 
            s.summary.toLowerCase().includes(term) ||
            s.tags.some(tag => tag.toLowerCase().includes(term))
          );
        }
        if (country) {
          scholarships = scholarships.filter(s => s.country_code === country.toUpperCase());
        }
        if (degree) {
          scholarships = scholarships.filter(s => s.degree_levels.includes(degree));
        }
        if (deadlineBefore) {
          scholarships = scholarships.filter(s => {
            const deadlineDate = new Date(s.deadline);
            const filterDate = new Date(deadlineBefore);
            return deadlineDate <= filterDate;
          });
        }
        totalCount = scholarships.length;
      }
    } else {
      // Apply client-side filtering to sample data when no database
      if (q && q.trim()) {
        const term = q.trim().toLowerCase();
        scholarships = sampleScholarships.filter(s => 
          s.title.toLowerCase().includes(term) || 
          s.summary.toLowerCase().includes(term) ||
          s.tags.some(tag => tag.toLowerCase().includes(term))
        );
      }
      if (country) {
        scholarships = scholarships.filter(s => s.country_code === country.toUpperCase());
      }
      if (degree) {
        scholarships = scholarships.filter(s => s.degree_levels.includes(degree));
      }
      if (deadlineBefore) {
        scholarships = scholarships.filter(s => {
          const deadlineDate = new Date(s.deadline);
          const filterDate = new Date(deadlineBefore);
          return deadlineDate <= filterDate;
        });
      }
      totalCount = scholarships.length;
    }

    // Apply pagination to results
    const paginatedScholarships = scholarships.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalCount / limit);

    // Calculate featured count
    const featuredCount = scholarships.filter(s => s.featured).length;
    
    res.render('pages/scholarships', {
      title: q ? `Search Results for "${q}" - ScholarPathway` : 'Scholarships - ScholarPathway',
      description: 'Browse scholarships and study abroad opportunities by country, degree level, and deadline.',
      scholarships: paginatedScholarships,
      countries,
      featuredCount,
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
    console.error('❌ Scholarships page error:', error);
    // Ultimate fallback with sample data
    const { q, country, degree, deadlineBefore, page = 1 } = req.query;
    const fallbackScholarships = sampleScholarships.slice(0, 6);
    const fallbackFeaturedCount = fallbackScholarships.filter(s => s.featured).length;
    
    res.render('pages/scholarships', {
      title: q ? `Search Results for "${q}" - ScholarPathway` : 'Scholarships - ScholarPathway',
      description: 'Browse scholarships and study abroad opportunities.',
      scholarships: fallbackScholarships,
      countries: countriesList.slice(0, 10).map(c => ({ code: c.code, name: c.name })),
      featuredCount: fallbackFeaturedCount,
      filters: { q, country, degree, deadlineBefore },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 6,
        hasNext: false,
        hasPrev: false
      },
      currentUrl: req.originalUrl
    });
  }
};

// Scholarship detail page with robust error handling
exports.scholarshipDetail = async (req, res) => {
  try {
    const { slug } = req.params;
    let scholarship = null;
    let related = [];

    // Check if it's a sample scholarship first
    const sampleScholarship = sampleScholarships.find(s => s.slug === slug);
    if (sampleScholarship) {
      scholarship = sampleScholarship;
      related = sampleScholarships.filter(s => s.slug !== slug && s.country_code === scholarship.country_code).slice(0, 3);
    }

    // Try database if Supabase is configured and not found in samples
    if (!scholarship && isConfigured && supabase) {
      try {
        const { data: dbScholarship } = await supabase
          .from('scholarships')
          .select(`
            *, countries(name)
          `)
          .eq('slug', slug)
          .eq('is_published', true)
          .single();

        if (dbScholarship) {
          scholarship = dbScholarship;

          // Get related scholarships
          const { data: dbRelated } = await supabase
            .from('scholarships')
            .select(`
              id, slug, title, country_code, degree_levels, deadline, summary, tags, amount,
              countries(name)
            `)
            .eq('is_published', true)
            .neq('id', scholarship.id)
            .eq('country_code', scholarship.country_code)
            .order('featured', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(4);

          related = dbRelated || [];
        }
      } catch (dbError) {
        console.warn('⚠️  Scholarship detail database query failed:', dbError.message);
      }
    }

    // If still not found, return 404
    if (!scholarship) {
      return res.status(404).render('pages/404', { 
        title: 'Scholarship Not Found',
        description: 'The scholarship you\'re looking for could not be found.'
      });
    }

    const canonicalUrl = `${process.env.SITE_URL || ''}/scholarships/${slug}`;

    res.render('pages/scholarship-detail', {
      title: `${scholarship.title} - ScholarPathway`,
      description: scholarship.summary,
      scholarship,
      related,
      canonicalUrl,
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('❌ Scholarship detail error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// Tips/Posts listing with robust error handling and fallback
exports.tips = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const paginationData = getPagination(page, 10);
    const { offset } = paginationData;
    const limit = paginationData.pageSize;
    
    let posts = [...samplePosts];
    let totalCount = samplePosts.length;

    // Try to fetch real data if Supabase is configured
    if (isConfigured && supabase) {
      try {
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

        if (postsResult.data && postsResult.data.length >= 0) {
          posts = postsResult.data;
          totalCount = countResult.count || 0;
        }
      } catch (dbError) {
        console.warn('⚠️  Tips database query failed, using fallback data:', dbError.message);
      }
    }
    
    // Apply pagination to sample data if using fallback
    if (!isConfigured || !supabase || posts === samplePosts) {
      posts = samplePosts.slice(offset, offset + limit);
      totalCount = samplePosts.length;
    }

    const totalPages = Math.ceil(totalCount / limit);

    res.render('pages/tips', {
      title: 'Study Tips & Guides - ScholarPathway',
      description: 'Get expert tips and guides for studying abroad, scholarship applications, and academic success.',
      posts: posts,
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
    console.error('❌ Tips page error:', error);
    // Ultimate fallback with sample data
    res.render('pages/tips', {
      title: 'Study Tips & Guides - ScholarPathway',
      description: 'Get expert tips and guides for studying abroad, scholarship applications, and academic success.',
      posts: samplePosts.slice(0, 6),
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 6,
        hasNext: false,
        hasPrev: false
      },
      currentUrl: req.originalUrl
    });
  }
};

// Tip/Post detail page with robust error handling
exports.tipDetail = async (req, res) => {
  try {
    const { slug } = req.params;
    let post = null;
    let recentPosts = [];

    // Check if it's a sample post first
    const samplePost = samplePosts.find(p => p.slug === slug);
    if (samplePost) {
      post = {
        ...samplePost,
        content: samplePost.content || `
          <div class="post-content">
            <p>Welcome to our comprehensive guide on <strong>${samplePost.title.toLowerCase()}</strong>! This article provides you with everything you need to know.</p>
            
            <h3>Why This Matters</h3>
            <p>${samplePost.summary} Our team of education experts has compiled the most important information to help you succeed.</p>
            
            <h3>Getting Started</h3>
            <p>The first step is understanding the fundamentals. Here are the key points you need to remember:</p>
            <ul>
              <li>Research thoroughly and start early</li>
              <li>Organize your materials and deadlines</li>
              <li>Seek guidance from mentors and advisors</li>
              <li>Stay persistent and don't give up</li>
            </ul>
            
            <h3>Pro Tips from Our Experts</h3>
            <p>Based on years of experience helping students succeed, here are our top recommendations:</p>
            <blockquote>
              <p>"Success in education comes from preparation, dedication, and knowing where to find the right opportunities. Never underestimate the power of good guidance."</p>
            </blockquote>
            
            <h3>Next Steps</h3>
            <p>Now that you understand the basics, it's time to take action. Visit our <a href="/scholarships">scholarships page</a> to explore opportunities that match your goals.</p>
            
            <p>Need more help? <a href="/contact">Contact our team</a> for personalized guidance on your educational journey.</p>
          </div>
        `
      };
      recentPosts = samplePosts.filter(p => p.slug !== slug).slice(0, 4);
    }

    // Try database if Supabase is configured and not found in samples
    if (!post && isConfigured && supabase) {
      try {
        const { data: dbPost } = await supabase
          .from('posts')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .single();

        if (dbPost) {
          post = dbPost;
          
          // Get recent posts from database
          const { data: dbRecentPosts } = await supabase
            .from('posts')
            .select('id, slug, title, created_at')
            .eq('is_published', true)
            .neq('id', post.id)
            .order('created_at', { ascending: false })
            .limit(5);

          recentPosts = dbRecentPosts || [];
        }
      } catch (dbError) {
        console.warn('⚠️  Tip detail database query failed:', dbError.message);
      }
    }

    // If still not found, return 404
    if (!post) {
      return res.status(404).render('pages/404', { 
        title: 'Article Not Found',
        description: 'The article you\'re looking for could not be found.'
      });
    }

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
    console.error('❌ Tip detail error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// Countries listing with robust error handling and fallback
exports.countries = async (req, res) => {
  try {
    let countriesWithCounts = sampleCountries.slice(0, 20);

    // Try to fetch real data if Supabase is configured
    if (isConfigured && supabase) {
      try {
        const { data: countries } = await supabase
          .from('countries')
          .select(`
            code, name,
            scholarships!inner(id)
          `)
          .order('name');

        if (countries && countries.length > 0) {
          countriesWithCounts = countries.map(country => ({
            ...country,
            count: country.scholarships ? country.scholarships.length : 0,
            flag: getCountryFlag(country.code)
          }));
        }
      } catch (dbError) {
        console.warn('⚠️  Countries database query failed, using fallback data:', dbError.message);
      }
    }

    // Ensure all countries have proper counts and flags from mega database
    countriesWithCounts = countriesWithCounts.map(country => {
      const scholarshipsForCountry = sampleScholarships.filter(s => s.country_code === country.code);
      return {
        ...country,
        count: scholarshipsForCountry.length || 0,
        scholarship_count: scholarshipsForCountry.length || 0,
        flag: country.flag || getCountryFlag(country.code)
      };
    }).filter(country => country.count > 0); // Only show countries with scholarships

    res.render('pages/countries', {
      title: 'Study Destinations - ScholarPathway',
      description: 'Explore scholarship opportunities by country. Find the perfect study destination for your academic journey.',
      countries: countriesWithCounts,
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('❌ Countries page error:', error);
    // Ultimate fallback with sample data using real counts
    const fallbackCountries = countriesList.slice(0, 12).map(c => {
      const scholarshipsForCountry = sampleScholarships.filter(s => s.country_code === c.code);
      return {
        code: c.code,
        name: c.name,
        count: scholarshipsForCountry.length || 0,
        flag: getCountryFlag(c.code)
      };
    }).filter(country => country.count > 0); // Only show countries with scholarships
    
    res.render('pages/countries', {
      title: 'Study Destinations - ScholarPathway',
      description: 'Explore scholarship opportunities by country.',
      countries: fallbackCountries,
      currentUrl: req.originalUrl
    });
  }
};

// Countries filter page
exports.countriesFilter = async (req, res) => {
  try {
    const { code } = req.params;
    const { page = 1 } = req.query;
    const paginationData = getPagination(page, 12);
    const { offset } = paginationData;
    const limit = paginationData.pageSize;
    
    // Get country info from static list
    const fromList = countriesList.find(c => c.code.toUpperCase() === code.toUpperCase());
    const fallbackCountry = fromList || { code: code.toUpperCase(), name: code.toUpperCase() };
    
    // Filter scholarships from mega database for this country
    const countryScholarships = sampleScholarships.filter(s => s.country_code === code.toUpperCase());
    const totalCount = countryScholarships.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedScholarships = countryScholarships.slice(offset, offset + limit);
    
    let country = fallbackCountry;
    let scholarships = paginatedScholarships;

    // Try to fetch real data if Supabase is configured
    if (isConfigured && supabase) {
      try {
        // Get country info
        const { data: dbCountry, error: countryError } = await supabase
          .from('countries')
          .select('code, name')
          .eq('code', code.toUpperCase())
          .single();

        if (dbCountry && !countryError) {
          country = dbCountry;
        }

        // Get scholarships for this country
        const [scholarshipsResult, countResult] = await Promise.all([
          supabase
            .from('scholarships')
            .select(`
              id, slug, title, country_code, degree_levels, deadline, summary, tags, featured, amount,
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

        if (scholarshipsResult.data && !scholarshipsResult.error && !countResult.error) {
          scholarships = scholarshipsResult.data;
          const dbTotalCount = countResult.count || 0;
          const dbTotalPages = Math.ceil(dbTotalCount / limit);
          
          return res.render('pages/country-scholarships', {
            title: `${country.name} Scholarships - ScholarPathway`,
            description: `Find scholarships and study opportunities in ${country.name}. Comprehensive list of available funding options.`,
            country: {
              ...country,
              flag: getCountryFlag(country.code)
            },
            scholarships: scholarships,
            pagination: {
              currentPage: parseInt(page),
              totalPages: dbTotalPages,
              totalCount: dbTotalCount,
              hasNext: parseInt(page) < dbTotalPages,
              hasPrev: parseInt(page) > 1
            },
            currentUrl: req.originalUrl
          });
        }
      } catch (dbError) {
        console.warn('⚠️  Country filter database query failed, using fallback data:', dbError.message);
      }
    }

    // Fallback to mega database scholarships
    res.render('pages/country-scholarships', {
      title: `${country.name} Scholarships - ScholarPathway`,
      description: `Find scholarships and study opportunities in ${country.name}. Comprehensive list of available funding options.`,
      country: {
        ...country,
        flag: getCountryFlag(country.code)
      },
      scholarships: paginatedScholarships,
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
    console.error('❌ Country filter error:', error);
    // Ultimate fallback to prevent 500 errors
    const { code } = req.params;
    const fromList = countriesList.find(c => c.code.toUpperCase() === code.toUpperCase());
    const fallbackCountry = fromList || { code: code.toUpperCase(), name: code.toUpperCase() };
    
    res.render('pages/country-scholarships', {
      title: `${fallbackCountry.name} Scholarships - ScholarPathway`,
      description: `Find scholarships and study opportunities in ${fallbackCountry.name}.`,
      country: { 
        code: fallbackCountry.code, 
        name: fallbackCountry.name, 
        flag: getCountryFlag(fallbackCountry.code) 
      },
      scholarships: sampleScholarships.filter(s => s.country_code === code.toUpperCase()).slice(0, 6),
      pagination: { currentPage: 1, totalPages: 1, totalCount: 6, hasNext: false, hasPrev: false },
      currentUrl: req.originalUrl
    });
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

// Contact form submission with robust error handling
exports.contactSubmit = async (req, res) => {
  try {
    // Add CORS headers for AJAX requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.headers['x-requested-with'] === 'XMLHttpRequest' || (req.headers.accept || '').includes('application/json')) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      return res.render('pages/contact', {
        title: 'Contact Us - ScholarPathway',
        description: 'Get in touch with ScholarPathway.',
        errors: errors.array(),
        formData: req.body,
        currentUrl: req.originalUrl
      });
    }

    const { name, email, message } = req.body;
    const cleanName = clean(name);
    const cleanEmail = email.toLowerCase().trim();
    const cleanMessage = clean(message);

    // Try to save to database if configured
    if (isConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('contacts')
          .insert([{
            name: cleanName,
            email: cleanEmail,
            message: cleanMessage,
            created_at: new Date().toISOString()
          }]);

        if (error) {
          console.warn('⚠️  Contact database save failed:', error.message);
        }
      } catch (dbError) {
        console.warn('⚠️  Contact database error:', dbError.message);
      }
    }

    // Send admin notification email
    try {
      const adminTo = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;
      if (adminTo) {
        const emailResult = await sendEmail({
          to: adminTo,
          subject: 'New Contact Message from ScholarPathway',
          html: `
            <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #0055FF;">New Contact Message</h2>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Name:</strong> ${cleanName}</p>
                <p><strong>Email:</strong> <a href="mailto:${cleanEmail}">${cleanEmail}</a></p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
                <h4 style="margin-top: 0;">Message:</h4>
                <p style="white-space: pre-wrap;">${cleanMessage}</p>
              </div>
            </div>
          `
        });
        
        if (emailResult && emailResult.skipped) {
          console.log('📧 Admin email service not configured');
        }
      }
    } catch (emailError) {
      console.warn('⚠️  Admin notification email failed:', emailError.message);
    }

    // Send confirmation email to user
    try {
      const confirmEmailResult = await sendEmail({
        to: cleanEmail,
        subject: 'Thank you for contacting ScholarPathway',
        html: `
          <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0055FF; text-align: center;">Thank You for Contacting Us!</h2>
            <p>Hi ${cleanName},</p>
            <p>We've received your message and will get back to you within 24-48 hours.</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0;">Your message:</h4>
              <p style="white-space: pre-wrap; font-style: italic;">${cleanMessage}</p>
            </div>
            <p>In the meantime, feel free to explore our <a href="${process.env.SITE_URL || ''}/scholarships" style="color: #0055FF;">latest scholarships</a> or check out our <a href="${process.env.SITE_URL || ''}/help" style="color: #0055FF;">Help Center</a>.</p>
            <p>Best regards,<br>The ScholarPathway Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.warn('⚠️  Confirmation email failed:', emailError.message);
    }

    const successMessage = 'Thank you for your message! We\'ll get back to you within 24-48 hours. 🚀';
    
    if (req.headers['x-requested-with'] === 'XMLHttpRequest' || (req.headers.accept || '').includes('application/json')) {
      return res.json({ success: successMessage });
    }
    
    res.render('pages/contact', {
      title: 'Contact Us - ScholarPathway',
      description: 'Get in touch with ScholarPathway.',
      success: successMessage,
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('❌ Contact submit error:', error);
    const errorMessage = 'Failed to send message. Please try again.';
    
    if (req.headers['x-requested-with'] === 'XMLHttpRequest' || (req.headers.accept || '').includes('application/json')) {
      return res.status(500).json({ error: errorMessage });
    }
    
    res.render('pages/contact', {
      title: 'Contact Us - ScholarPathway',
      description: 'Get in touch with ScholarPathway.',
      errors: [{ msg: errorMessage }],
      formData: req.body,
      currentUrl: req.originalUrl
    });
  }
};

// Newsletter subscription with robust error handling
exports.subscribe = async (req, res) => {
  try {
    // Add CORS headers for AJAX requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: errors.array()[0].msg || 'Please provide a valid email address' 
      });
    }

    const { email, source } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // Basic validation
    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Try to save to database if configured
    if (isConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('subscribers')
          .upsert([
            {
              email: cleanEmail,
              source: source || 'website',
              subscribed_at: new Date().toISOString(),
              is_active: true
            }
          ], { 
            onConflict: 'email',
            ignoreDuplicates: false 
          });

        if (error && !error.message.includes('duplicate')) {
          console.warn('⚠️  Database subscription failed:', error.message);
        }
      } catch (dbError) {
        console.warn('⚠️  Subscription database error:', dbError.message);
      }
    }

    // Send welcome email (if email service configured)
    try {
      const emailResult = await sendEmail({
        to: cleanEmail,
        subject: 'Welcome to ScholarPathway 🎓',
        html: `
          <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0055FF; text-align: center;">Welcome to ScholarPathway!</h2>
            <p>Hi there! 👋</p>
            <p>Thank you for subscribing to our newsletter. You\'re now part of a community of students pursuing their educational dreams worldwide!</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0055FF; margin-top: 0;">What to expect:</h3>
              <ul>
                <li>🎓 Weekly scholarship opportunities</li>
                <li>📝 Application tips and guides</li>
                <li>🌍 Study abroad insights</li>
                <li>📅 Important deadline reminders</li>
              </ul>
            </div>
            <p>Start exploring scholarships: <a href="${process.env.SITE_URL || 'https://scholarpathway.com'}/scholarships" style="color: #0055FF;">Browse Now</a></p>
            <p>Best of luck with your applications!</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">You can unsubscribe at any time using the link at the bottom of our emails.</p>
          </div>
        `
      });
      
      if (emailResult && emailResult.skipped) {
        console.log('📧 Email service not configured, subscription recorded');
      }
    } catch (emailError) {
      console.warn('⚠️  Welcome email failed:', emailError.message);
    }

    res.json({ 
      success: 'Successfully subscribed! Check your email for a welcome message. 🎉' 
    });
  } catch (error) {
    console.error('❌ Subscribe error:', error);
    res.status(500).json({ 
      error: 'Subscription failed. Please try again later.' 
    });
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