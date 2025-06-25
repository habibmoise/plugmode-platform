/*
  # Enhanced Job Management & Automated Collection for PlugMode

  1. Enhanced Jobs Table
    - Add new columns for job intelligence and automation
    - Add experience level, job type, remote type
    - Add culture scores and regional hiring data
    - Add auto-collection tracking

  2. New Tables
    - `job_sources` - Track automated job collection sources
    - `job_matches` - Store AI-powered job-user matches
    - `search_analytics` - Track search queries for automation improvement

  3. Indexes
    - Optimize search performance
    - Support filtering and sorting

  4. Security
    - Enable RLS on new tables
    - Add appropriate policies
*/

-- Enhance jobs table with new columns
DO $$
BEGIN
  -- Add experience_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'experience_level'
  ) THEN
    ALTER TABLE jobs ADD COLUMN experience_level text CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead', 'any'));
  END IF;

  -- Add job_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'job_type'
  ) THEN
    ALTER TABLE jobs ADD COLUMN job_type text DEFAULT 'full-time' CHECK (job_type IN ('full-time', 'part-time', 'contract', 'freelance'));
  END IF;

  -- Add is_remote column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'is_remote'
  ) THEN
    ALTER TABLE jobs ADD COLUMN is_remote boolean DEFAULT true;
  END IF;

  -- Add remote_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'remote_type'
  ) THEN
    ALTER TABLE jobs ADD COLUMN remote_type text DEFAULT 'fully-remote' CHECK (remote_type IN ('fully-remote', 'hybrid', 'remote-friendly', 'on-site'));
  END IF;

  -- Add culture_score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'culture_score'
  ) THEN
    ALTER TABLE jobs ADD COLUMN culture_score integer DEFAULT 0 CHECK (culture_score >= 0 AND culture_score <= 100);
  END IF;

  -- Add regional_hiring column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'regional_hiring'
  ) THEN
    ALTER TABLE jobs ADD COLUMN regional_hiring jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add auto_collected column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'auto_collected'
  ) THEN
    ALTER TABLE jobs ADD COLUMN auto_collected boolean DEFAULT false;
  END IF;

  -- Add skills_required column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'skills_required'
  ) THEN
    ALTER TABLE jobs ADD COLUMN skills_required text[] DEFAULT '{}';
  END IF;

  -- Add salary_min and salary_max columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'salary_min'
  ) THEN
    ALTER TABLE jobs ADD COLUMN salary_min integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'salary_max'
  ) THEN
    ALTER TABLE jobs ADD COLUMN salary_max integer;
  END IF;
END $$;

-- Create job_sources table for automated collection
CREATE TABLE IF NOT EXISTS job_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('api', 'scraper', 'rss', 'webhook')),
  last_scraped timestamptz,
  active_status boolean DEFAULT true,
  scrape_frequency interval DEFAULT '1 hour',
  total_jobs_collected integer DEFAULT 0,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create job_matches table for AI matching
CREATE TABLE IF NOT EXISTS job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  match_score integer NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  notified_at timestamptz,
  viewed_at timestamptz,
  UNIQUE(user_id, job_id)
);

-- Create search_analytics table for search tracking
CREATE TABLE IF NOT EXISTS search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  search_query text,
  filters_applied jsonb DEFAULT '{}'::jsonb,
  results_count integer DEFAULT 0,
  clicked_job_ids uuid[],
  search_timestamp timestamptz DEFAULT now(),
  session_id text
);

-- Enable Row Level Security
ALTER TABLE job_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Job sources policies (admin only for now)
CREATE POLICY "Service role can manage job sources"
  ON job_sources
  FOR ALL
  TO service_role
  USING (true);

-- Job matches policies
CREATE POLICY "Users can read own job matches"
  ON job_matches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert job matches"
  ON job_matches
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own job matches"
  ON job_matches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Search analytics policies
CREATE POLICY "Users can insert own search analytics"
  ON search_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can read search analytics"
  ON search_analytics
  FOR SELECT
  TO service_role
  USING (true);

-- Create enhanced indexes for search and filtering
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_remote_type ON jobs(remote_type);
CREATE INDEX IF NOT EXISTS idx_jobs_culture_score ON jobs(culture_score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_salary_range ON jobs(salary_min, salary_max);
CREATE INDEX IF NOT EXISTS idx_jobs_auto_collected ON jobs(auto_collected);
CREATE INDEX IF NOT EXISTS idx_jobs_skills_gin ON jobs USING gin(skills_required);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_jobs_search ON jobs USING gin(
  to_tsvector('english', title || ' ' || company || ' ' || COALESCE(description, ''))
);

-- Job matches indexes
CREATE INDEX IF NOT EXISTS idx_job_matches_user_id ON job_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_score ON job_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_job_matches_created_at ON job_matches(created_at DESC);

-- Search analytics indexes
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(search_timestamp DESC);

-- Insert initial job sources for automation
INSERT INTO job_sources (source_name, source_url, source_type, config) VALUES
('RemoteOK API', 'https://remoteok.io/api', 'api', '{"api_key_required": false, "rate_limit": "100/hour"}'),
('We Work Remotely RSS', 'https://weworkremotely.com/remote-jobs.rss', 'rss', '{"update_frequency": "1 hour"}'),
('AngelList API', 'https://api.angel.co/1/jobs', 'api', '{"api_key_required": true, "rate_limit": "1000/hour"}'),
('GitHub Jobs API', 'https://jobs.github.com/positions.json', 'api', '{"api_key_required": false, "deprecated": true}'),
('Dappier Job Intelligence', 'https://api.dappier.com/jobs', 'api', '{"api_key_required": true, "real_time": true}')
ON CONFLICT DO NOTHING;