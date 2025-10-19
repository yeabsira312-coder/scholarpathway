-- supabase-seed.sql
-- Generated from data/mega-scholarships.js
-- This file creates/upsers countries and scholarships in the ScholarPathway schema.
-- Review before running. Run in Supabase SQL editor or psql connected to your DB.

BEGIN;

-- Upsert countries (collecting unique country codes from the dataset)
-- Note: flag_emoji values are approximations; update as desired.

INSERT INTO countries (code, name, flag_emoji)
VALUES
  ('US', 'United States', '🇺🇸'),
  ('GB', 'United Kingdom', '🇬🇧'),
  ('CA', 'Canada', '🇨🇦'),
  ('AU', 'Australia', '🇦🇺'),
  ('DE', 'Germany', '🇩🇪'),
  ('FR', 'France', '🇫🇷'),
  ('JP', 'Japan', '🇯🇵'),
  ('NL', 'Netherlands', '🇳🇱'),
  ('CH', 'Switzerland', '🇨🇭'),
  ('SG', 'Singapore', '🇸🇬'),
  ('SE', 'Sweden', '🇸🇪'),
  ('NO', 'Norway', '🇳🇴')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      flag_emoji = COALESCE(EXCLUDED.flag_emoji, countries.flag_emoji),
      updated_at = NOW();

-- Upsert scholarships
-- The script below inserts a representative subset of the generated mega dataset.
-- For a full import, consider converting the data script to CSV and using `COPY` for performance.

-- Example insertion rows (add more programmatically if needed)
INSERT INTO scholarships (slug, title, summary, content, country_code, degree_levels, deadline, amount, tags, featured, is_published, official_link, created_at, updated_at)
VALUES
  ('harvard-university-merit-scholarship-0', 'Harvard University Merit Scholarship', 'Merit Scholarship program at Harvard University for exceptional students. Comprehensive support for academic excellence.', NULL, 'US', ARRAY['Undergraduate'], '2025-01-15'::timestamptz, '$10,000-$30,000', ARRAY['Merit','Academic'], true, true, 'https://harvarduniversity.edu/scholarships', NOW(), NOW()),
  ('stanford-university-need-based-aid-1', 'Stanford University Need-Based Aid', 'Need-Based Aid program at Stanford University for exceptional students. Comprehensive support for academic excellence.', NULL, 'US', ARRAY['Masters'], '2025-02-28'::timestamptz, 'Full funding + stipend', ARRAY['Need-based','Financial Aid'], true, true, 'https://stanforduniversity.edu/scholarships', NOW(), NOW()),
  ('university-of-oxford-rhodes-scholarship', 'Rhodes Scholarships - Oxford University', 'The world''s oldest international scholarship programme at Oxford.', NULL, 'GB', ARRAY['Masters','PhD'], '2025-10-01'::timestamptz, '£18,180 + fees', ARRAY['Prestigious','Oxford'], true, true, 'https://www.rhodeshouse.ox.ac.uk/', NOW(), NOW()),
  ('gates-cambridge-scholarship', 'Gates Cambridge Scholarships', 'Full-cost scholarships for outstanding students from outside the UK.', NULL, 'GB', ARRAY['Masters','PhD'], '2025-12-01'::timestamptz, '£45,000+ per year', ARRAY['Full Scholarship','Cambridge'], true, true, 'https://www.gatescambridge.org/', NOW(), NOW())
ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      content = COALESCE(EXCLUDED.content, scholarships.content),
      country_code = EXCLUDED.country_code,
      degree_levels = EXCLUDED.degree_levels,
      deadline = EXCLUDED.deadline,
      amount = EXCLUDED.amount,
      tags = EXCLUDED.tags,
      featured = EXCLUDED.featured,
      is_published = EXCLUDED.is_published,
      official_link = EXCLUDED.official_link,
      updated_at = NOW();

COMMIT;

-- End of seed file
