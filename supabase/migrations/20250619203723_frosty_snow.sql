/*
  # Automated Backend Triggers for PlugMode

  1. Database Triggers
    - Create triggers on user_events table to automatically call Supabase Edge Functions
    - Trigger job-interaction function for job_saved and job_applied events
    - Trigger recommendations-engine function for job interactions and search events
    - Trigger insights-generation function for profile updates and significant events

  2. Functions
    - Create PostgreSQL functions to call Supabase Edge Functions via HTTP
    - Handle different event types and route to appropriate functions
    - Include error handling and logging

  3. Event Processing
    - Automatic processing of user events as they occur
    - Real-time recommendation updates
    - Automated insights generation
*/

-- Create function to call Supabase Edge Functions via HTTP
CREATE OR REPLACE FUNCTION call_edge_function(
  function_name text,
  payload jsonb
) RETURNS void AS $$
DECLARE
  supabase_url text := current_setting('app.settings.supabase_url', true);
  service_role_key text := current_setting('app.settings.service_role_key', true);
  response text;
BEGIN
  -- Only proceed if we have the required settings
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE LOG 'Supabase URL or Service Role Key not configured for edge function calls';
    RETURN;
  END IF;

  -- Make HTTP request to edge function
  SELECT content INTO response
  FROM http((
    'POST',
    supabase_url || '/functions/v1/' || function_name,
    ARRAY[
      http_header('Authorization', 'Bearer ' || service_role_key),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    payload::text
  )::http_request);

  RAISE LOG 'Called edge function % with response: %', function_name, response;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error calling edge function %: %', function_name, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process job interaction events
CREATE OR REPLACE FUNCTION process_job_interaction_event()
RETURNS trigger AS $$
BEGIN
  -- Process job_saved and job_applied events
  IF NEW.event_type IN ('job_saved', 'job_applied') THEN
    PERFORM call_edge_function(
      'job-interaction',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'job_id', NEW.event_data->>'job_id',
        'interaction_type', NEW.event_type,
        'job_data', NEW.event_data,
        'timestamp', NEW.created_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to process recommendation events
CREATE OR REPLACE FUNCTION process_recommendation_event()
RETURNS trigger AS $$
BEGIN
  -- Process events that should trigger recommendation updates
  IF NEW.event_type IN ('job_viewed', 'job_saved', 'job_applied', 'search_filters_changed') THEN
    PERFORM call_edge_function(
      'recommendations-engine',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'event_type', NEW.event_type,
        'event_data', NEW.event_data,
        'timestamp', NEW.created_at,
        'recommendation_types', ARRAY['skill_addition', 'job_application', 'career_path']
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to process insights generation events
CREATE OR REPLACE FUNCTION process_insights_generation_event()
RETURNS trigger AS $$
BEGIN
  -- Process events that should trigger insights generation
  IF NEW.event_type IN ('profile_updated', 'job_applied', 'search_filters_changed') THEN
    PERFORM call_edge_function(
      'insights-generation',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'event_type', NEW.event_type,
        'event_data', NEW.event_data,
        'timestamp', NEW.created_at,
        'insight_types', ARRAY['skills_gap', 'salary_benchmark', 'job_match_summary']
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to process job matching events
CREATE OR REPLACE FUNCTION process_job_matching_event()
RETURNS trigger AS $$
BEGIN
  -- Process events that should trigger job matching
  IF NEW.event_type IN ('profile_updated', 'job_saved', 'job_applied') THEN
    PERFORM call_edge_function(
      'job-matching',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'event_type', NEW.event_type,
        'event_data', NEW.event_data,
        'timestamp', NEW.created_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on user_events table
DROP TRIGGER IF EXISTS trigger_job_interaction_events ON user_events;
CREATE TRIGGER trigger_job_interaction_events
  AFTER INSERT ON user_events
  FOR EACH ROW
  EXECUTE FUNCTION process_job_interaction_event();

DROP TRIGGER IF EXISTS trigger_recommendation_events ON user_events;
CREATE TRIGGER trigger_recommendation_events
  AFTER INSERT ON user_events
  FOR EACH ROW
  EXECUTE FUNCTION process_recommendation_event();

DROP TRIGGER IF EXISTS trigger_insights_generation_events ON user_events;
CREATE TRIGGER trigger_insights_generation_events
  AFTER INSERT ON user_events
  FOR EACH ROW
  EXECUTE FUNCTION process_insights_generation_event();

DROP TRIGGER IF EXISTS trigger_job_matching_events ON user_events;
CREATE TRIGGER trigger_job_matching_events
  AFTER INSERT ON user_events
  FOR EACH ROW
  EXECUTE FUNCTION process_job_matching_event();

-- Create trigger on users table for profile updates
CREATE OR REPLACE FUNCTION log_profile_update_event()
RETURNS trigger AS $$
BEGIN
  -- Log profile update event when user data changes
  IF OLD IS DISTINCT FROM NEW THEN
    INSERT INTO user_events (user_id, event_type, event_data)
    VALUES (
      NEW.id,
      'profile_updated',
      jsonb_build_object(
        'fields_updated', ARRAY[
          CASE WHEN OLD.name IS DISTINCT FROM NEW.name THEN 'name' END,
          CASE WHEN OLD.location IS DISTINCT FROM NEW.location THEN 'location' END,
          CASE WHEN OLD.skills IS DISTINCT FROM NEW.skills THEN 'skills' END,
          CASE WHEN OLD.experience_level IS DISTINCT FROM NEW.experience_level THEN 'experience_level' END,
          CASE WHEN OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN 'avatar_url' END
        ]::text[] - ARRAY[NULL],
        'profile_data', jsonb_build_object(
          'name', NEW.name,
          'location', NEW.location,
          'skills', NEW.skills,
          'experience_level', NEW.experience_level,
          'avatar_url', NEW.avatar_url
        ),
        'updated_at', NEW.created_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profile_update_events ON users;
CREATE TRIGGER trigger_profile_update_events
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_profile_update_event();

-- Create function to handle new job additions for matching
CREATE OR REPLACE FUNCTION process_new_job_event()
RETURNS trigger AS $$
BEGIN
  -- Trigger job matching for all users when new jobs are added
  PERFORM call_edge_function(
    'job-matching',
    jsonb_build_object(
      'job_id', NEW.id,
      'event_type', 'new_job_added',
      'job_data', jsonb_build_object(
        'title', NEW.title,
        'company', NEW.company,
        'category', NEW.category,
        'skills_required', NEW.skills_required,
        'experience_level', NEW.experience_level,
        'location', NEW.location
      ),
      'batch_match', true,
      'timestamp', NEW.created_at
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_new_job_matching ON jobs;
CREATE TRIGGER trigger_new_job_matching
  AFTER INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION process_new_job_event();

-- Create indexes for better trigger performance
CREATE INDEX IF NOT EXISTS idx_user_events_type_user_created ON user_events(event_type, user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_events_processing ON user_events(created_at) WHERE event_type IN ('job_saved', 'job_applied', 'profile_updated');