/*
  # Phase 4: Company Profiles, Personalized Insights & Regional Intelligence

  1. New Tables
    - `companies` - Company profiles with logos, descriptions, hiring patterns
    - `user_insights` - Personalized insights and recommendations for users
    - `recommendation_history` - Track recommendation effectiveness
    - `regional_market_data` - Salary benchmarks and market trends by region

  2. Enhanced Features
    - Company intelligence and hiring patterns
    - Personalized dashboard insights
    - Skills matching algorithms
    - Regional salary benchmarks
    - Automated recommendation tracking

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for data access
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  website text,
  logo_url text,
  size text CHECK (size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
  hiring_regions jsonb DEFAULT '{}'::jsonb,
  culture_score integer DEFAULT 0 CHECK (culture_score >= 0 AND culture_score <= 100),
  hiring_stats jsonb DEFAULT '{}'::jsonb,
  benefits jsonb DEFAULT '{}'::jsonb,
  tech_stack text[],
  founded_year integer,
  headquarters text,
  employee_count_range text,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create user_insights table
CREATE TABLE IF NOT EXISTS user_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_type text NOT NULL CHECK (insight_type IN ('skills_gap', 'market_trend', 'salary_benchmark', 'career_recommendation', 'job_match_summary')),
  insight_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'acted_upon')),
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  automation_source text,
  effectiveness_score integer CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100)
);

-- Create recommendation_history table
CREATE TABLE IF NOT EXISTS recommendation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('skill_addition', 'job_application', 'profile_completion', 'career_path', 'salary_negotiation')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  effectiveness_score integer CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100),
  user_action text CHECK (user_action IN ('accepted', 'dismissed', 'partially_accepted', 'no_action')),
  recommended_at timestamptz DEFAULT now(),
  acted_upon_at timestamptz,
  outcome_data jsonb DEFAULT '{}'::jsonb
);

-- Create regional_market_data table
CREATE TABLE IF NOT EXISTS regional_market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  country text NOT NULL,
  job_category text NOT NULL,
  experience_level text NOT NULL CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead')),
  avg_salary_usd integer,
  salary_range_min integer,
  salary_range_max integer,
  job_count integer DEFAULT 0,
  growth_rate decimal(5,2),
  top_skills text[],
  market_trends jsonb DEFAULT '{}'::jsonb,
  data_source text,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(region, country, job_category, experience_level)
);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_market_data ENABLE ROW LEVEL SECURITY;

-- Companies policies (public read, service role write)
CREATE POLICY "Anyone can read companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage companies"
  ON companies
  FOR ALL
  TO service_role
  USING (true);

-- User insights policies
CREATE POLICY "Users can read own insights"
  ON user_insights
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON user_insights
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert insights"
  ON user_insights
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Recommendation history policies
CREATE POLICY "Users can read own recommendations"
  ON recommendation_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations"
  ON recommendation_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert recommendations"
  ON recommendation_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Regional market data policies (public read)
CREATE POLICY "Anyone can read market data"
  ON regional_market_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage market data"
  ON regional_market_data
  FOR ALL
  TO service_role
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_size ON companies(size);
CREATE INDEX IF NOT EXISTS idx_companies_culture_score ON companies(culture_score DESC);

CREATE INDEX IF NOT EXISTS idx_user_insights_user_id ON user_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_user_insights_type ON user_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_user_insights_priority ON user_insights(priority);
CREATE INDEX IF NOT EXISTS idx_user_insights_status ON user_insights(status);
CREATE INDEX IF NOT EXISTS idx_user_insights_generated_at ON user_insights(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendation_history_user_id ON recommendation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_history_type ON recommendation_history(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_history_effectiveness ON recommendation_history(effectiveness_score DESC);

CREATE INDEX IF NOT EXISTS idx_regional_market_data_region ON regional_market_data(region, country);
CREATE INDEX IF NOT EXISTS idx_regional_market_data_category ON regional_market_data(job_category);
CREATE INDEX IF NOT EXISTS idx_regional_market_data_experience ON regional_market_data(experience_level);

-- Add company_id to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN company_id uuid REFERENCES companies(id);
  END IF;
END $$;

-- Create index for company_id
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);

-- Insert sample companies
INSERT INTO companies (name, description, website, size, hiring_regions, culture_score, hiring_stats, benefits, tech_stack, founded_year, headquarters, employee_count_range) VALUES
('TechGlobal', 'Leading global technology company specializing in web applications and cloud solutions. We actively hire from underserved regions and provide comprehensive remote work support.', 'https://techglobal.com', 'large', 
 '{"africa": true, "asia": true, "latam": true, "hiring_from_nigeria": 15, "hiring_from_kenya": 8, "hiring_from_indonesia": 12}'::jsonb,
 92, 
 '{"total_remote_hires": 450, "international_hires_last_year": 89, "retention_rate": 94, "avg_time_to_hire": "3 weeks"}'::jsonb,
 '{"equipment_stipend": "$2000", "home_office_setup": true, "learning_budget": "$3000", "health_insurance": true, "flexible_hours": true}'::jsonb,
 ARRAY['React', 'Node.js', 'AWS', 'TypeScript', 'Docker'],
 2018, 'San Francisco, CA', '200-500'),

('DataCorp', 'Data analytics and machine learning company with a strong commitment to diversity and global talent acquisition.', 'https://datacorp.com', 'medium',
 '{"africa": true, "asia": true, "latam": true, "visa_sponsorship": true}'::jsonb,
 88,
 '{"total_remote_hires": 120, "international_hires_last_year": 34, "retention_rate": 91, "avg_time_to_hire": "4 weeks"}'::jsonb,
 '{"equipment_stipend": "$1500", "learning_budget": "$2500", "health_insurance": true, "flexible_hours": true, "conference_budget": "$1000"}'::jsonb,
 ARRAY['Python', 'SQL', 'TensorFlow', 'AWS', 'Kubernetes'],
 2020, 'Austin, TX', '50-200'),

('WebCorp', 'Frontend development agency creating beautiful user interfaces for global clients. Remote-first culture since inception.', 'https://webcorp.com', 'small',
 '{"africa": true, "asia": true, "latam": true, "timezone_flexible": true}'::jsonb,
 85,
 '{"total_remote_hires": 45, "international_hires_last_year": 18, "retention_rate": 89, "avg_time_to_hire": "2 weeks"}'::jsonb,
 '{"equipment_stipend": "$1000", "flexible_hours": true, "unlimited_pto": true, "learning_budget": "$1500"}'::jsonb,
 ARRAY['React', 'Vue.js', 'CSS', 'JavaScript', 'Figma'],
 2019, 'Remote', '10-50'),

('CloudTech', 'Cloud infrastructure and DevOps solutions provider with teams across 15 countries.', 'https://cloudtech.com', 'large',
 '{"africa": true, "asia": true, "latam": true, "global_team": true}'::jsonb,
 90,
 '{"total_remote_hires": 280, "international_hires_last_year": 67, "retention_rate": 93, "avg_time_to_hire": "3 weeks"}'::jsonb,
 '{"equipment_stipend": "$2500", "home_office_setup": true, "learning_budget": "$4000", "health_insurance": true, "stock_options": true}'::jsonb,
 ARRAY['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Python'],
 2017, 'Seattle, WA', '500-1000'),

('StartupCorp', 'Fast-growing startup in the fintech space, building the future of digital payments with a global perspective.', 'https://startupcorp.com', 'startup',
 '{"africa": true, "asia": true, "latam": true, "early_career_friendly": true}'::jsonb,
 82,
 '{"total_remote_hires": 35, "international_hires_last_year": 12, "retention_rate": 87, "avg_time_to_hire": "2 weeks"}'::jsonb,
 '{"equity_package": true, "flexible_hours": true, "learning_budget": "$2000", "equipment_stipend": "$1200"}'::jsonb,
 ARRAY['React', 'Node.js', 'PostgreSQL', 'Redis', 'Stripe'],
 2022, 'New York, NY', '10-50')
ON CONFLICT (name) DO NOTHING;

-- Insert sample regional market data
INSERT INTO regional_market_data (region, country, job_category, experience_level, avg_salary_usd, salary_range_min, salary_range_max, job_count, growth_rate, top_skills, market_trends) VALUES
('West Africa', 'Nigeria', 'Engineering', 'entry', 35000, 25000, 45000, 156, 15.5, 
 ARRAY['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
 '{"demand_growth": "high", "remote_adoption": 85, "top_hiring_companies": ["TechGlobal", "DataCorp"], "salary_trend": "increasing"}'::jsonb),

('West Africa', 'Nigeria', 'Engineering', 'mid', 55000, 45000, 70000, 89, 18.2,
 ARRAY['React', 'Node.js', 'AWS', 'TypeScript', 'Docker'],
 '{"demand_growth": "very_high", "remote_adoption": 90, "top_hiring_companies": ["CloudTech", "TechGlobal"], "salary_trend": "increasing"}'::jsonb),

('East Africa', 'Kenya', 'Engineering', 'entry', 32000, 22000, 42000, 78, 12.8,
 ARRAY['JavaScript', 'Python', 'React', 'SQL', 'Git'],
 '{"demand_growth": "high", "remote_adoption": 80, "top_hiring_companies": ["WebCorp", "StartupCorp"], "salary_trend": "stable"}'::jsonb),

('Southeast Asia', 'Indonesia', 'Engineering', 'mid', 48000, 38000, 62000, 134, 20.1,
 ARRAY['JavaScript', 'React', 'Node.js', 'AWS', 'MongoDB'],
 '{"demand_growth": "very_high", "remote_adoption": 88, "top_hiring_companies": ["TechGlobal", "CloudTech"], "salary_trend": "increasing"}'::jsonb),

('West Africa', 'Nigeria', 'Design', 'mid', 42000, 32000, 55000, 34, 14.2,
 ARRAY['Figma', 'Adobe Creative Suite', 'UI/UX Design', 'Prototyping', 'User Research'],
 '{"demand_growth": "high", "remote_adoption": 85, "top_hiring_companies": ["WebCorp", "StartupCorp"], "salary_trend": "increasing"}'::jsonb),

('Latin America', 'Brazil', 'Engineering', 'senior', 75000, 60000, 95000, 67, 16.7,
 ARRAY['React', 'Node.js', 'AWS', 'TypeScript', 'Kubernetes'],
 '{"demand_growth": "high", "remote_adoption": 92, "top_hiring_companies": ["CloudTech", "TechGlobal"], "salary_trend": "increasing"}'::jsonb)
ON CONFLICT (region, country, job_category, experience_level) DO NOTHING;

-- Update existing jobs to link with companies
UPDATE jobs SET company_id = companies.id
FROM companies
WHERE jobs.company = companies.name;