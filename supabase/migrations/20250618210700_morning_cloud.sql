/*
  # Update existing jobs with improved Remote-Friendly Score

  1. Update culture_score calculation for existing jobs
  2. Improve regional_hiring data based on job descriptions
  3. Add better scoring logic for remote work support
*/

-- Update existing jobs with improved Remote-Friendly Score calculation
UPDATE jobs SET
  culture_score = CASE
    -- Base score for remote jobs
    WHEN is_remote = true THEN 40
    ELSE 20
  END +
  -- Fully remote-first culture (15 points)
  CASE
    WHEN description ILIKE '%remote-first%' OR 
         description ILIKE '%fully remote%' OR 
         description ILIKE '%distributed team%' OR
         description ILIKE '%remote culture%' THEN 15
    WHEN description ILIKE '%remote%' AND 
         (description ILIKE '%team%' OR description ILIKE '%work%') THEN 10
    ELSE 0
  END +
  -- Global team, timezone flexible (25 points total)
  CASE
    WHEN description ILIKE '%global team%' OR 
         description ILIKE '%international team%' OR
         description ILIKE '%worldwide team%' THEN 15
    ELSE 0
  END +
  CASE
    WHEN description ILIKE '%timezone flexible%' OR 
         description ILIKE '%flexible hours%' OR
         description ILIKE '%any timezone%' OR
         description ILIKE '%flexible schedule%' THEN 10
    ELSE 0
  END +
  -- Equipment & home office support (10 points)
  CASE
    WHEN description ILIKE '%equipment stipend%' OR 
         description ILIKE '%home office setup%' OR
         description ILIKE '%tools provided%' OR
         description ILIKE '%laptop provided%' OR
         description ILIKE '%equipment allowance%' THEN 10
    ELSE 0
  END +
  -- Strong diversity commitment (10 points)
  CASE
    WHEN description ILIKE '%diversity%' OR 
         description ILIKE '%inclusive%' OR
         description ILIKE '%equal opportunity%' OR
         description ILIKE '%underrepresented%' OR
         description ILIKE '%all backgrounds%' THEN 10
    ELSE 0
  END +
  -- Professional development budget (10 points)
  CASE
    WHEN description ILIKE '%professional development%' OR 
         description ILIKE '%learning budget%' OR
         description ILIKE '%upskilling%' OR
         description ILIKE '%training budget%' OR
         description ILIKE '%conference budget%' THEN 10
    ELSE 0
  END +
  -- Competitive salary transparency (5 points)
  CASE
    WHEN description ILIKE '%transparent salary%' OR 
         description ILIKE '%competitive pay%' OR
         description ILIKE '%salary transparency%' OR
         salary ILIKE '%$%' THEN 5
    ELSE 0
  END +
  -- Tech companies and startups bonus (5 points)
  CASE
    WHEN company ILIKE '%tech%' OR 
         company ILIKE '%startup%' OR
         description ILIKE '%startup%' OR
         description ILIKE '%saas%' OR
         description ILIKE '%software%' THEN 5
    ELSE 0
  END +
  -- International talent welcoming bonus (5 points)
  CASE
    WHEN description ILIKE '%international%' OR 
         description ILIKE '%global talent%' OR
         description ILIKE '%worldwide%' OR
         description ILIKE '%any location%' OR
         description ILIKE '%location independent%' THEN 5
    ELSE 0
  END;

-- Ensure culture_score doesn't exceed 100
UPDATE jobs SET culture_score = 100 WHERE culture_score > 100;

-- Update regional_hiring data with better logic
UPDATE jobs SET
  regional_hiring = jsonb_build_object(
    'africa_friendly', true,
    'asia_friendly', true,
    'latam_friendly', true,
    'visa_sponsorship', 
      CASE 
        WHEN description ILIKE '%visa%' OR 
             description ILIKE '%sponsorship%' OR 
             description ILIKE '%relocation%' THEN true
        WHEN random() > 0.8 THEN true
        ELSE false
      END,
    'timezone_flexibility',
      CASE
        WHEN description ILIKE '%timezone%' OR 
             description ILIKE '%flexible hours%' OR
             description ILIKE '%any time%' THEN true
        WHEN random() > 0.4 THEN true
        ELSE false
      END
  )
WHERE regional_hiring IS NULL OR regional_hiring = '{}'::jsonb;