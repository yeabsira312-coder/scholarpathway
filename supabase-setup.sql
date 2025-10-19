-- ScholarPathway Database Setup for Supabase
-- Run this in Supabase SQL Editor

-- Create subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'website',
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contacts table  
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  flag_emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scholarships table
CREATE TABLE IF NOT EXISTS scholarships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  country_code TEXT REFERENCES countries(code),
  degree_levels TEXT[] DEFAULT '{}',
  deadline TIMESTAMP WITH TIME ZONE,
  amount TEXT,
  tags TEXT[] DEFAULT '{}',
  featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  official_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table (for tips)
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample countries
INSERT INTO countries (code, name, flag_emoji) VALUES
('US', 'United States', '🇺🇸'),
('GB', 'United Kingdom', '🇬🇧'),
('CA', 'Canada', '🇨🇦'),
('AU', 'Australia', '🇦🇺'),
('DE', 'Germany', '🇩🇪'),
('FR', 'France', '🇫🇷'),
('JP', 'Japan', '🇯🇵'),
('CN', 'China', '🇨🇳'),
('SG', 'Singapore', '🇸🇬'),
('KR', 'South Korea', '🇰🇷')
ON CONFLICT (code) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed)
CREATE POLICY "Allow public read access on countries" ON countries FOR SELECT USING (true);
CREATE POLICY "Allow public read access on published scholarships" ON scholarships FOR SELECT USING (is_published = true);
CREATE POLICY "Allow public read access on published posts" ON posts FOR SELECT USING (is_published = true);
CREATE POLICY "Allow public insert on subscribers" ON subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on contacts" ON contacts FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scholarships_country_code ON scholarships(country_code);
CREATE INDEX IF NOT EXISTS idx_scholarships_featured ON scholarships(featured);
CREATE INDEX IF NOT EXISTS idx_scholarships_published ON scholarships(is_published);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(featured);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(is_published);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

-- Success message
SELECT 'ScholarPathway database setup complete! 🚀' as message;