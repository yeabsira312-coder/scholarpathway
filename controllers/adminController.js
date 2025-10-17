const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { clean } = require('../utils/sanitize');
const { generateSlug } = require('../utils/slug');
const { getPagination } = require('../utils/pagination');

// Login page
exports.loginPage = (req, res) => {
  res.render('pages/admin/login', {
    title: 'Admin Login - ScholarPathway',
    layout: 'layouts/admin-auth'
  });
};

// Login
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('pages/admin/login', {
        title: 'Admin Login - ScholarPathway',
        layout: 'layouts/admin-auth',
        errors: errors.array(),
        formData: req.body
      });
    }

    const { email, password } = req.body;

    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, password_hash, role')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !admin || !await bcrypt.compare(password, admin.password_hash)) {
      return res.render('pages/admin/login', {
        title: 'Admin Login - ScholarPathway',
        layout: 'layouts/admin-auth',
        errors: [{ msg: 'Invalid email or password' }],
        formData: req.body
      });
    }

    // Update last login
    await supabase
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    // Set session
    req.session.user = {
      id: admin.id,
      email: admin.email,
      role: admin.role
    };

    res.redirect('/admin');
  } catch (error) {
    console.error('Login error:', error);
    res.render('pages/admin/login', {
      title: 'Admin Login - ScholarPathway',
      layout: 'layouts/admin-auth',
      errors: [{ msg: 'Login failed. Please try again.' }],
      formData: req.body
    });
  }
};

// Logout
exports.logout = (req, res) => {
  req.session = null;
  res.redirect('/admin/login');
};

// Dashboard
exports.dashboard = async (req, res) => {
  try {
    // Get counts
    const [scholarshipsResult, postsResult, subscribersResult, contactsResult] = await Promise.all([
      supabase.from('scholarships').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('subscribers').select('*', { count: 'exact', head: true }),
      supabase.from('contacts').select('*', { count: 'exact', head: true })
    ]);

    // Get recent scholarships
    const { data: recentScholarships } = await supabase
      .from('scholarships')
      .select('id, title, slug, country_code, is_published, created_at, countries(name)')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get recent posts
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, title, slug, is_published, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    res.render('pages/admin/dashboard', {
      title: 'Admin Dashboard - ScholarPathway',
      stats: {
        scholarships: scholarshipsResult.count || 0,
        posts: postsResult.count || 0,
        subscribers: subscribersResult.count || 0,
        contacts: contactsResult.count || 0
      },
      recentScholarships: recentScholarships || [],
      recentPosts: recentPosts || [],
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// Scholarships list
exports.scholarshipsList = async (req, res) => {
  try {
    const { page = 1, search } = req.query;
    const { offset, limit } = getPagination(page, 20);

    let query = supabase
      .from('scholarships')
      .select(`
        id, title, slug, country_code, is_published, featured, created_at, updated_at,
        countries(name)
      `)
      .order('created_at', { ascending: false });

    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,summary.ilike.%${search.trim()}%`);
    }

    const [scholarshipsResult, countResult] = await Promise.all([
      query.range(offset, offset + limit - 1),
      supabase
        .from('scholarships')
        .select('*', { count: 'exact', head: true })
    ]);

    if (scholarshipsResult.error) throw scholarshipsResult.error;
    if (countResult.error) throw countResult.error;

    const totalCount = countResult.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.render('pages/admin/scholarships-list', {
      title: 'Manage Scholarships - ScholarPathway',
      scholarships: scholarshipsResult.data || [],
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      search,
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Scholarships list error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// New scholarship form
exports.scholarshipsNew = async (req, res) => {
  try {
    const { data: countries } = await supabase
      .from('countries')
      .select('code, name')
      .order('name');

    res.render('pages/admin/scholarships-form', {
      title: 'Add New Scholarship - ScholarPathway',
      scholarship: null,
      countries: countries || [],
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('New scholarship error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// Create scholarship
exports.scholarshipsCreate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const { data: countries } = await supabase
        .from('countries')
        .select('code, name')
        .order('name');

      return res.render('pages/admin/scholarships-form', {
        title: 'Add New Scholarship - ScholarPathway',
        scholarship: null,
        countries: countries || [],
        errors: errors.array(),
        formData: req.body,
        currentUrl: req.originalUrl
      });
    }

    const {
      title, slug, country_code, degree_levels, deadline, summary, eligibility,
      benefits, how_to_apply, official_link, tags, featured, is_published
    } = req.body;

    // Generate slug if not provided
    const finalSlug = slug && slug.trim() ? generateSlug(slug) : generateSlug(title);

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('scholarships')
      .select('id')
      .eq('slug', finalSlug)
      .single();

    if (existing) {
      const { data: countries } = await supabase
        .from('countries')
        .select('code, name')
        .order('name');

      return res.render('pages/admin/scholarships-form', {
        title: 'Add New Scholarship - ScholarPathway',
        scholarship: null,
        countries: countries || [],
        errors: [{ msg: 'URL slug already exists. Please use a different one.' }],
        formData: req.body,
        currentUrl: req.originalUrl
      });
    }

    const scholarshipData = {
      title: clean(title),
      slug: finalSlug,
      country_code: country_code.toUpperCase(),
      degree_levels: Array.isArray(degree_levels) ? degree_levels : [degree_levels].filter(Boolean),
      deadline: deadline || null,
      summary: clean(summary),
      eligibility: clean(eligibility),
      benefits: clean(benefits),
      how_to_apply: clean(how_to_apply),
      official_link: official_link.trim(),
      tags: Array.isArray(tags) ? tags.filter(tag => tag.trim()) : tags.split(',').map(tag => tag.trim()).filter(Boolean),
      featured: featured === 'on',
      is_published: is_published === 'on'
    };

    const { error } = await supabase
      .from('scholarships')
      .insert([scholarshipData]);

    if (error) throw error;

    res.redirect('/admin/scholarships?success=created');
  } catch (error) {
    console.error('Create scholarship error:', error);
    const { data: countries } = await supabase
      .from('countries')
      .select('code, name')
      .order('name');

    res.render('pages/admin/scholarships-form', {
      title: 'Add New Scholarship - ScholarPathway',
      scholarship: null,
      countries: countries || [],
      errors: [{ msg: 'Failed to create scholarship. Please try again.' }],
      formData: req.body,
      currentUrl: req.originalUrl
    });
  }
};

// Edit scholarship form
exports.scholarshipsEdit = async (req, res) => {
  try {
    const { id } = req.params;

    const [scholarshipResult, countriesResult] = await Promise.all([
      supabase
        .from('scholarships')
        .select('*')
        .eq('id', id)
        .single(),
      supabase
        .from('countries')
        .select('code, name')
        .order('name')
    ]);

    if (scholarshipResult.error || !scholarshipResult.data) {
      return res.status(404).render('pages/404', { title: 'Scholarship Not Found' });
    }

    res.render('pages/admin/scholarships-form', {
      title: `Edit ${scholarshipResult.data.title} - ScholarPathway`,
      scholarship: scholarshipResult.data,
      countries: countriesResult.data || [],
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Edit scholarship error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// Update scholarship
exports.scholarshipsUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const [scholarshipResult, countriesResult] = await Promise.all([
        supabase.from('scholarships').select('*').eq('id', id).single(),
        supabase.from('countries').select('code, name').order('name')
      ]);

      return res.render('pages/admin/scholarships-form', {
        title: `Edit Scholarship - ScholarPathway`,
        scholarship: scholarshipResult.data,
        countries: countriesResult.data || [],
        errors: errors.array(),
        formData: req.body,
        currentUrl: req.originalUrl
      });
    }

    const {
      title, slug, country_code, degree_levels, deadline, summary, eligibility,
      benefits, how_to_apply, official_link, tags, featured, is_published
    } = req.body;

    // Generate slug if not provided
    const finalSlug = slug && slug.trim() ? generateSlug(slug) : generateSlug(title);

    // Check slug uniqueness (excluding current record)
    const { data: existing } = await supabase
      .from('scholarships')
      .select('id')
      .eq('slug', finalSlug)
      .neq('id', id)
      .single();

    if (existing) {
      const [scholarshipResult, countriesResult] = await Promise.all([
        supabase.from('scholarships').select('*').eq('id', id).single(),
        supabase.from('countries').select('code, name').order('name')
      ]);

      return res.render('pages/admin/scholarships-form', {
        title: `Edit Scholarship - ScholarPathway`,
        scholarship: scholarshipResult.data,
        countries: countriesResult.data || [],
        errors: [{ msg: 'URL slug already exists. Please use a different one.' }],
        formData: req.body,
        currentUrl: req.originalUrl
      });
    }

    const scholarshipData = {
      title: clean(title),
      slug: finalSlug,
      country_code: country_code.toUpperCase(),
      degree_levels: Array.isArray(degree_levels) ? degree_levels : [degree_levels].filter(Boolean),
      deadline: deadline || null,
      summary: clean(summary),
      eligibility: clean(eligibility),
      benefits: clean(benefits),
      how_to_apply: clean(how_to_apply),
      official_link: official_link.trim(),
      tags: Array.isArray(tags) ? tags.filter(tag => tag.trim()) : tags.split(',').map(tag => tag.trim()).filter(Boolean),
      featured: featured === 'on',
      is_published: is_published === 'on'
    };

    const { error } = await supabase
      .from('scholarships')
      .update(scholarshipData)
      .eq('id', id);

    if (error) throw error;

    res.redirect('/admin/scholarships?success=updated');
  } catch (error) {
    console.error('Update scholarship error:', error);
    const [scholarshipResult, countriesResult] = await Promise.all([
      supabase.from('scholarships').select('*').eq('id', req.params.id).single(),
      supabase.from('countries').select('code, name').order('name')
    ]);

    res.render('pages/admin/scholarships-form', {
      title: `Edit Scholarship - ScholarPathway`,
      scholarship: scholarshipResult.data,
      countries: countriesResult.data || [],
      errors: [{ msg: 'Failed to update scholarship. Please try again.' }],
      formData: req.body,
      currentUrl: req.originalUrl
    });
  }
};

// Delete scholarship
exports.scholarshipsDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('scholarships')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.redirect('/admin/scholarships?success=deleted');
  } catch (error) {
    console.error('Delete scholarship error:', error);
    res.redirect('/admin/scholarships?error=delete-failed');
  }
};

// Posts list
exports.postsList = async (req, res) => {
  try {
    const { page = 1, search } = req.query;
    const { offset, limit } = getPagination(page, 20);

    let query = supabase
      .from('posts')
      .select('id, title, slug, is_published, featured, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,summary.ilike.%${search.trim()}%`);
    }

    const [postsResult, countResult] = await Promise.all([
      query.range(offset, offset + limit - 1),
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
    ]);

    if (postsResult.error) throw postsResult.error;
    if (countResult.error) throw countResult.error;

    const totalCount = countResult.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.render('pages/admin/posts-list', {
      title: 'Manage Posts - ScholarPathway',
      posts: postsResult.data || [],
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      search,
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Posts list error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// New post form
exports.postsNew = (req, res) => {
  res.render('pages/admin/posts-form', {
    title: 'Add New Post - ScholarPathway',
    post: null,
    currentUrl: req.originalUrl
  });
};

// Create post
exports.postsCreate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('pages/admin/posts-form', {
        title: 'Add New Post - ScholarPathway',
        post: null,
        errors: errors.array(),
        formData: req.body,
        currentUrl: req.originalUrl
      });
    }

    const { title, slug, summary, content, tags, featured, is_published } = req.body;

    // Generate slug if not provided
    const finalSlug = slug && slug.trim() ? generateSlug(slug) : generateSlug(title);

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', finalSlug)
      .single();

    if (existing) {
      return res.render('pages/admin/posts-form', {
        title: 'Add New Post - ScholarPathway',
        post: null,
        errors: [{ msg: 'URL slug already exists. Please use a different one.' }],
        formData: req.body,
        currentUrl: req.originalUrl
      });
    }

    const postData = {
      title: clean(title),
      slug: finalSlug,
      summary: clean(summary),
      content: clean(content),
      tags: Array.isArray(tags) ? tags.filter(tag => tag.trim()) : tags.split(',').map(tag => tag.trim()).filter(Boolean),
      featured: featured === 'on',
      is_published: is_published === 'on'
    };

    const { error } = await supabase
      .from('posts')
      .insert([postData]);

    if (error) throw error;

    res.redirect('/admin/posts?success=created');
  } catch (error) {
    console.error('Create post error:', error);
    res.render('pages/admin/posts-form', {
      title: 'Add New Post - ScholarPathway',
      post: null,
      errors: [{ msg: 'Failed to create post. Please try again.' }],
      formData: req.body,
      currentUrl: req.originalUrl
    });
  }
};

// Edit post form
exports.postsEdit = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !post) {
      return res.status(404).render('pages/404', { title: 'Post Not Found' });
    }

    res.render('pages/admin/posts-form', {
      title: `Edit ${post.title} - ScholarPathway`,
      post,
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Edit post error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// Update post
exports.postsUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const { data: post } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      return res.render('pages/admin/posts-form', {
        title: `Edit Post - ScholarPathway`,
        post,
        errors: errors.array(),
        formData: req.body,
        currentUrl: req.originalUrl
      });
    }

    const { title, slug, summary, content, tags, featured, is_published } = req.body;

    // Generate slug if not provided
    const finalSlug = slug && slug.trim() ? generateSlug(slug) : generateSlug(title);

    // Check slug uniqueness (excluding current record)
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', finalSlug)
      .neq('id', id)
      .single();

    if (existing) {
      const { data: post } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      return res.render('pages/admin/posts-form', {
        title: `Edit Post - ScholarPathway`,
        post,
        errors: [{ msg: 'URL slug already exists. Please use a different one.' }],
        formData: req.body,
        currentUrl: req.originalUrl
      });
    }

    const postData = {
      title: clean(title),
      slug: finalSlug,
      summary: clean(summary),
      content: clean(content),
      tags: Array.isArray(tags) ? tags.filter(tag => tag.trim()) : tags.split(',').map(tag => tag.trim()).filter(Boolean),
      featured: featured === 'on',
      is_published: is_published === 'on'
    };

    const { error } = await supabase
      .from('posts')
      .update(postData)
      .eq('id', id);

    if (error) throw error;

    res.redirect('/admin/posts?success=updated');
  } catch (error) {
    console.error('Update post error:', error);
    const { data: post } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.render('pages/admin/posts-form', {
      title: `Edit Post - ScholarPathway`,
      post,
      errors: [{ msg: 'Failed to update post. Please try again.' }],
      formData: req.body,
      currentUrl: req.originalUrl
    });
  }
};

// Delete post
exports.postsDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.redirect('/admin/posts?success=deleted');
  } catch (error) {
    console.error('Delete post error:', error);
    res.redirect('/admin/posts?error=delete-failed');
  }
};

// Countries list
exports.countriesList = async (req, res) => {
  try {
    const { data: countries, error } = await supabase
      .from('countries')
      .select(`
        code, name,
        scholarships(id)
      `)
      .order('name');

    if (error) throw error;

    const countriesWithCounts = countries.map(country => ({
      ...country,
      scholarshipCount: country.scholarships ? country.scholarships.length : 0
    }));

    res.render('pages/admin/countries-list', {
      title: 'Manage Countries - ScholarPathway',
      countries: countriesWithCounts,
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Countries list error:', error);
    res.status(500).render('pages/500', { title: 'Server Error' });
  }
};

// Upsert country
exports.countriesUpsert = async (req, res) => {
  try {
    const { code, name } = req.body;

    if (!code || !name || code.length !== 2) {
      return res.redirect('/admin/countries?error=invalid-data');
    }

    const { error } = await supabase
      .from('countries')
      .upsert([{
        code: code.toUpperCase(),
        name: clean(name)
      }], { onConflict: 'code' });

    if (error) throw error;

    res.redirect('/admin/countries?success=saved');
  } catch (error) {
    console.error('Upsert country error:', error);
    res.redirect('/admin/countries?error=save-failed');
  }
};

// Delete country
exports.countriesDelete = async (req, res) => {
  try {
    const { code } = req.params;

    // Check if country has scholarships
    const { data: scholarships } = await supabase
      .from('scholarships')
      .select('id')
      .eq('country_code', code.toUpperCase())
      .limit(1);

    if (scholarships && scholarships.length > 0) {
      return res.redirect('/admin/countries?error=has-scholarships');
    }

    const { error } = await supabase
      .from('countries')
      .delete()
      .eq('code', code.toUpperCase());

    if (error) throw error;

    res.redirect('/admin/countries?success=deleted');
  } catch (error) {
    console.error('Delete country error:', error);
    res.redirect('/admin/countries?error=delete-failed');
  }
};