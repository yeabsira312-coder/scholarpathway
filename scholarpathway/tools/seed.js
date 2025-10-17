/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { toSlug } = require('../utils/slug');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'JP', name: 'Japan' }
];

const scholarships = [
  {
    title: 'Harvard Undergraduate Scholarship',
    country_code: 'US',
    degree_levels: ['Undergraduate'],
    deadline: '2025-01-15',
    summary: 'Need-based financial aid for undergraduate students at Harvard College.',
    eligibility: 'Demonstrated financial need and strong academic record.',
    benefits: 'Covers tuition, room, board depending on need.',
    how_to_apply: 'Apply via Harvard College financial aid with required documentation.',
    official_link: 'https://college.harvard.edu/financial-aid',
    tags: ['USA', 'Undergraduate'],
    featured: true
  },
  {
    title: 'DAAD Scholarship',
    country_code: 'DE',
    degree_levels: ['Masters', 'PhD'],
    deadline: '2025-10-15',
    summary: 'Funding for international students to study in Germany.',
    eligibility: 'Strong academic profile, program-specific requirements.',
    benefits: 'Monthly stipend, travel allowance, health insurance.',
    how_to_apply: 'Apply via DAAD portal with program-specific docs.',
    official_link: 'https://www.daad.de/en/',
    tags: ['Germany', 'Masters', 'PhD'],
    featured: true
  },
  {
    title: 'MEXT Scholarship',
    country_code: 'JP',
    degree_levels: ['Undergraduate', 'Masters', 'PhD'],
    deadline: '2025-06-01',
    summary: 'Japanese Government MEXT scholarships for international students.',
    eligibility: 'Age, academic, and health requirements per category.',
    benefits: 'Tuition, monthly allowance, airfare.',
    how_to_apply: 'Apply via Japanese Embassy or designated universities.',
    official_link: 'https://www.mext.go.jp/',
    tags: ['Japan'],
    featured: false
  },
  {
    title: 'Lester B. Pearson Scholarship',
    country_code: 'CA',
    degree_levels: ['Undergraduate'],
    deadline: '2024-12-01',
    summary: 'U of T full scholarship recognizing outstanding students.',
    eligibility: 'Exceptional academic achievement and creativity.',
    benefits: 'Full tuition, books, incidental fees, residence for four years.',
    how_to_apply: 'Nomination by school and application to U of T.',
    official_link: 'https://future.utoronto.ca/pearson/',
    tags: ['Canada'],
    featured: true
  },
  {
    title: 'Chevening Scholarship',
    country_code: 'GB',
    degree_levels: ['Masters'],
    deadline: '2025-11-01',
    summary: 'UK government scholarships for future leaders to study in the UK.',
    eligibility: 'Work experience, leadership potential, academic record.',
    benefits: 'Tuition, stipend, travel, visa costs.',
    how_to_apply: 'Apply via Chevening online application system.',
    official_link: 'https://www.chevening.org/',
    tags: ['UK', 'Masters'],
    featured: true
  }
];

const posts = [
  {
    title: 'How to Write a Great Scholarship Essay',
    summary: 'Actionable tips to make your scholarship essay stand out from the competition.',
    content: 'Writing a compelling scholarship essay requires careful planning and attention to detail. Start early to give yourself time to brainstorm, draft, and revise. Understand the prompt thoroughly and answer it directly. Tell a compelling personal story that showcases your unique qualities and experiences. Be specific with examples and avoid generic statements. Finally, revise thoroughly for grammar, clarity, and impact.',
    tags: ['Essay', 'Tips'],
    featured: false
  },
  {
    title: 'Top 5 Scholarships for African Students',
    summary: 'A curated list of the most generous scholarship opportunities for African students.',
    content: 'African students have access to numerous prestigious scholarships. The Chevening Scholarship offers full funding for UK masters programs. The Mastercard Foundation Scholars Program supports undergraduate and graduate studies. DAAD scholarships provide opportunities to study in Germany. MEXT scholarships offer pathways to Japanese universities. Commonwealth Scholarships support study in Commonwealth countries.',
    tags: ['Africa', 'Scholarships'],
    featured: true
  },
  {
    title: 'How to Apply for a Student Visa Easily',
    summary: 'Essential checklist and timing strategies for smooth visa applications.',
    content: 'Student visa applications can be complex, but proper preparation makes the process smoother. Start by gathering all required documents early, including financial statements, acceptance letters, and academic transcripts. Schedule your visa interview well in advance, as appointment slots fill up quickly. Follow embassy guidelines precisely and be prepared to explain your study plans. Consider consulting with educational advisors for country-specific requirements.',
    tags: ['Visa', 'Guides'],
    featured: false
  }
];

async function upsertCountries() {
  const { error } = await supabase.from('countries').upsert(countries, { onConflict: 'code' });
  if (error) throw error;
  console.log('Countries upserted');
}

async function upsertScholarships() {
  const rows = scholarships.map(s => ({ ...s, slug: toSlug(s.title) }));
  const { error } = await supabase.from('scholarships').upsert(rows, { onConflict: 'slug' });
  if (error) throw error;
  console.log('Scholarships upserted');
}

async function upsertPosts() {
  const rows = posts.map(p => ({ ...p, slug: toSlug(p.title) }));
  const { error } = await supabase.from('posts').upsert(rows, { onConflict: 'slug' });
  if (error) throw error;
  console.log('Posts upserted');
}

async function ensureAdmin() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  
  if (!email || !password) {
    console.warn('Skipping admin bootstrap: missing ADMIN_BOOTSTRAP_EMAIL or ADMIN_BOOTSTRAP_PASSWORD');
    return;
  }
  
  const { data: existing, error: selErr } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
    
  if (selErr) throw selErr;
  
  if (existing) {
    console.log('Admin user already exists');
    return;
  }
  
  const password_hash = await bcrypt.hash(password, 12);
  const { error } = await supabase
    .from('admin_users')
    .insert([{ email, password_hash }]);
    
  if (error) throw error;
  console.log('Admin user created:', email);
}

(async () => {
  try {
    await upsertCountries();
    await upsertScholarships();
    await upsertPosts();
    await ensureAdmin();
    console.log('Seed complete');
    process.exit(0);
  } catch (e) {
    console.error('Seed failed:', e);
    process.exit(1);
  }
})();