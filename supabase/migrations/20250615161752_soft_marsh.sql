/*
  # PlugMode Career OS Features - Resume Upload, Job Management, Application Tracking

  1. New Tables
    - `resumes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - references users.id
      - `file_url` (text) - Supabase storage URL for resume file
      - `file_name` (text) - original filename
      - `file_size` (integer) - file size in bytes
      - `extracted_text` (text) - text extracted from PDF via OpenAI
      - `uploaded_at` (timestamp) - when resume was uploaded
      - `processing_status` (text) - pending, processing, completed, failed
      - `processing_error` (text) - error message if processing failed

    - `saved_jobs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - references users.id
      - `job_id` (uuid, foreign key) - references jobs.id
      - `saved_at` (timestamp) - when job was saved
      - `notes` (text) - user notes about the job
      - `interaction_type` (text) - saved, interested, applied

    - `applications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - references users.id
      - `job_id` (uuid, foreign key) - references jobs.id
      - `applied_at` (timestamp) - when application was submitted
      - `status` (text) - applied, reviewing, interview, rejected, offer
      - `automation_enabled` (boolean) - whether automation is enabled for this application
      - `notes` (text) - application notes
      - `last_updated` (timestamp) - when status was last updated

    - `automation_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - references users.id
      - `workflow_type` (text) - resume_uploaded, job_saved, profile_updated, application_status
      - `status` (text) - pending, processing, completed, failed
      - `executed_at` (timestamp) - when workflow was executed
      - `result_data` (jsonb) - workflow execution results
      - `webhook_url` (text) - n8n webhook URL that was called

  2. Security
    - Enable RLS on all new tables
    - Add policies for users to manage their own data
    - Add policies for automation system access

  3. Storage
    - Create storage bucket for resume files
    - Set up security policies for file access
*/

-- Create resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  extracted_text text,
  uploaded_at timestamptz DEFAULT now(),
  processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error text
);

-- Create saved_jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at timestamptz DEFAULT now(),
  notes text,
  interaction_type text DEFAULT 'saved' CHECK (interaction_type IN ('saved', 'interested', 'applied')),
  UNIQUE(user_id, job_id)
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applied_at timestamptz DEFAULT now(),
  status text DEFAULT 'applied' CHECK (status IN ('applied', 'reviewing', 'interview', 'rejected', 'offer')),
  automation_enabled boolean DEFAULT false,
  notes text,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Create automation_logs table
CREATE TABLE IF NOT EXISTS automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_type text NOT NULL CHECK (workflow_type IN ('resume_uploaded', 'job_saved', 'profile_updated', 'application_status')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  executed_at timestamptz DEFAULT now(),
  result_data jsonb DEFAULT '{}'::jsonb,
  webhook_url text
);

-- Enable Row Level Security
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Resumes policies
CREATE POLICY "Users can read own resumes"
  ON resumes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes"
  ON resumes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
  ON resumes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON resumes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Saved jobs policies
CREATE POLICY "Users can read own saved jobs"
  ON saved_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved jobs"
  ON saved_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved jobs"
  ON saved_jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved jobs"
  ON saved_jobs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Applications policies
CREATE POLICY "Users can read own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications"
  ON applications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Automation logs policies
CREATE POLICY "Users can read own automation logs"
  ON automation_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own automation logs"
  ON automation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_processing_status ON resumes(processing_status);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_automation_logs_user_id ON automation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_workflow_type ON automation_logs(workflow_type);

-- Create storage bucket for resumes (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resumes
CREATE POLICY "Users can upload own resumes"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own resumes"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own resumes"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);