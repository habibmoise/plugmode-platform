/*
  # Update existing jobs with enhanced data

  1. Update existing jobs with default values for new columns
  2. Parse salary ranges into min/max values
  3. Set experience levels based on job titles
  4. Add culture scores and regional hiring data
*/

-- Update existing jobs with default enhanced data
UPDATE jobs SET
  experience_level = CASE
    WHEN title ILIKE '%senior%' OR title ILIKE '%lead%' OR title ILIKE '%principal%' THEN 'senior'
    WHEN title ILIKE '%junior%' OR title ILIKE '%entry%' OR title ILIKE '%graduate%' THEN 'entry'
    WHEN title ILIKE '%mid%' OR title ILIKE '%intermediate%' THEN 'mid'
    ELSE 'any'
  END,
  job_type = 'full-time',
  is_remote = true,
  remote_type = 'fully-remote',
  culture_score = CASE
    WHEN company ILIKE '%tech%' OR company ILIKE '%startup%' THEN 85
    WHEN company ILIKE '%corp%' OR company ILIKE '%global%' THEN 75
    ELSE 70
  END,
  auto_collected = false,
  skills_required = CASE
    WHEN category = 'Engineering' THEN 
      CASE
        WHEN title ILIKE '%react%' THEN ARRAY['React', 'JavaScript', 'HTML/CSS']
        WHEN title ILIKE '%python%' THEN ARRAY['Python', 'SQL', 'Git']
        WHEN title ILIKE '%node%' THEN ARRAY['Node.js', 'JavaScript', 'Express']
        WHEN title ILIKE '%full%stack%' THEN ARRAY['JavaScript', 'React', 'Node.js', 'SQL']
        WHEN title ILIKE '%frontend%' THEN ARRAY['JavaScript', 'React', 'HTML/CSS', 'TypeScript']
        WHEN title ILIKE '%backend%' THEN ARRAY['Python', 'SQL', 'API Development', 'Git']
        WHEN title ILIKE '%mobile%' THEN ARRAY['React Native', 'JavaScript', 'Mobile Development']
        WHEN title ILIKE '%devops%' THEN ARRAY['AWS', 'Docker', 'Kubernetes', 'CI/CD']
        WHEN title ILIKE '%qa%' OR title ILIKE '%test%' THEN ARRAY['Testing', 'Automation', 'QA']
        ELSE ARRAY['Programming', 'Problem Solving', 'Git']
      END
    WHEN category = 'Design' THEN ARRAY['UI/UX Design', 'Figma', 'Adobe Creative Suite', 'Prototyping']
    WHEN category = 'Management' THEN ARRAY['Project Management', 'Leadership', 'Communication', 'Team Management']
    WHEN category = 'Other' THEN
      CASE
        WHEN title ILIKE '%data%' THEN ARRAY['Data Analysis', 'SQL', 'Python', 'Statistics']
        WHEN title ILIKE '%marketing%' THEN ARRAY['Digital Marketing', 'SEO', 'Content Marketing', 'Analytics']
        WHEN title ILIKE '%sales%' THEN ARRAY['Sales', 'CRM', 'Lead Generation', 'Communication']
        WHEN title ILIKE '%content%' OR title ILIKE '%writer%' THEN ARRAY['Content Writing', 'SEO', 'Research', 'English']
        ELSE ARRAY['Communication', 'Problem Solving', 'Remote Work']
      END
    ELSE ARRAY['Communication', 'Problem Solving', 'Remote Work']
  END,
  regional_hiring = jsonb_build_object(
    'africa_friendly', true,
    'asia_friendly', true,
    'latam_friendly', true,
    'visa_sponsorship', CASE WHEN random() > 0.7 THEN true ELSE false END,
    'timezone_flexibility', CASE WHEN random() > 0.5 THEN true ELSE false END
  )
WHERE experience_level IS NULL;

-- Parse salary ranges into min/max values
UPDATE jobs SET
  salary_min = CASE
    WHEN salary ~ '^\$?(\d+)-(\d+)k$' THEN 
      (regexp_match(salary, '^\$?(\d+)-(\d+)k$'))[1]::integer * 1000
    WHEN salary ~ '^\$?(\d+)k-(\d+)k$' THEN 
      (regexp_match(salary, '^\$?(\d+)k-(\d+)k$'))[1]::integer * 1000
    WHEN salary ~ '^\$?(\d+)k\+$' THEN 
      (regexp_match(salary, '^\$?(\d+)k\+$'))[1]::integer * 1000
    WHEN salary ~ '^\$?(\d+),(\d+)-\$?(\d+),(\d+)$' THEN 
      (regexp_match(salary, '^\$?(\d+),(\d+)-\$?(\d+),(\d+)$'))[1]::integer * 1000 + 
      (regexp_match(salary, '^\$?(\d+),(\d+)-\$?(\d+),(\d+)$'))[2]::integer
    ELSE NULL
  END,
  salary_max = CASE
    WHEN salary ~ '^\$?(\d+)-(\d+)k$' THEN 
      (regexp_match(salary, '^\$?(\d+)-(\d+)k$'))[2]::integer * 1000
    WHEN salary ~ '^\$?(\d+)k-(\d+)k$' THEN 
      (regexp_match(salary, '^\$?(\d+)k-(\d+)k$'))[2]::integer * 1000
    WHEN salary ~ '^\$?(\d+)k\+$' THEN 
      (regexp_match(salary, '^\$?(\d+)k\+$'))[1]::integer * 1000 + 20000
    WHEN salary ~ '^\$?(\d+),(\d+)-\$?(\d+),(\d+)$' THEN 
      (regexp_match(salary, '^\$?(\d+),(\d+)-\$?(\d+),(\d+)$'))[3]::integer * 1000 + 
      (regexp_match(salary, '^\$?(\d+),(\d+)-\$?(\d+),(\d+)$'))[4]::integer
    ELSE NULL
  END
WHERE salary_min IS NULL;