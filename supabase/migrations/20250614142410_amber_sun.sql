/*
  # Initial PlugMode Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - matches auth.users id
      - `name` (text) - user's full name
      - `email` (text, unique) - user's email address
      - `location` (text) - user's location (e.g., "Lagos, Nigeria")
      - `skills` (text array) - array of user's skills
      - `experience_level` (text) - entry, mid, senior, lead
      - `created_at` (timestamp) - when user was created
      - `automation_preferences` (jsonb) - preferences for automation workflows

    - `jobs`
      - `id` (uuid, primary key)
      - `title` (text) - job title
      - `company` (text) - company name
      - `description` (text) - job description
      - `location` (text) - job location
      - `salary` (text) - salary range
      - `category` (text) - job category (Engineering, Design, etc.)
      - `created_at` (timestamp) - when job was posted
      - `source_url` (text) - original job posting URL
      - `last_updated` (timestamp) - when job was last updated

    - `user_events`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - references users.id
      - `event_type` (text) - type of event (signup, profile_update, job_save, etc.)
      - `event_data` (jsonb) - additional event data for automation
      - `created_at` (timestamp) - when event occurred

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for public job viewing
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text UNIQUE NOT NULL,
  location text,
  skills text[] DEFAULT '{}',
  experience_level text CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead')),
  created_at timestamptz DEFAULT now(),
  automation_preferences jsonb DEFAULT '{}'::jsonb
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  description text,
  location text NOT NULL,
  salary text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  source_url text,
  last_updated timestamptz DEFAULT now()
);

-- Create user_events table for automation tracking
CREATE TABLE IF NOT EXISTS user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Jobs policies (public read access for job browsing)
CREATE POLICY "Anyone can read jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (true);

-- User events policies
CREATE POLICY "Users can read own events"
  ON user_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON user_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);