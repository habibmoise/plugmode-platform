/*
  # Enhance Users Table with First/Last Name Support

  1. Database Changes
    - Add `first_name` and `last_name` columns to users table
    - Keep existing `name` column for backward compatibility
    - Update existing data to populate new columns

  2. Indexes
    - Add index on first_name for better search performance
*/

-- Add first_name and last_name columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE users ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE users ADD COLUMN last_name text;
  END IF;
END $$;

-- Populate first_name and last_name from existing name column
UPDATE users 
SET 
  first_name = CASE 
    WHEN name IS NOT NULL AND name != '' THEN split_part(name, ' ', 1)
    ELSE NULL
  END,
  last_name = CASE 
    WHEN name IS NOT NULL AND name != '' AND array_length(string_to_array(name, ' '), 1) > 1 
    THEN substring(name from position(' ' in name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL AND last_name IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);