-- =====================================================
-- MIGRATION: Add verification and Google Auth support
-- Run this if you already have the original schema
-- =====================================================

-- Add is_verified column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Add auth_provider column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';

-- Make contact_number nullable (for Google auth users who don't have it initially)
ALTER TABLE profiles 
ALTER COLUMN contact_number DROP NOT NULL;

-- Remove student-related constraints if they exist
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_student;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_employee;

-- Drop user_type column if it exists (we're removing students)
ALTER TABLE profiles DROP COLUMN IF EXISTS user_type;

-- Drop college-related columns (students removed)
ALTER TABLE profiles DROP COLUMN IF EXISTS college_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS course;
ALTER TABLE profiles DROP COLUMN IF EXISTS year_level;

-- Drop colleges table if exists
DROP TABLE IF EXISTS colleges CASCADE;

-- Update weekly_schedule_limits to remove user_type dependency
DROP TABLE IF EXISTS weekly_schedule_limits CASCADE;

CREATE TABLE IF NOT EXISTS weekly_schedule_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    max_appointments_per_week INTEGER NOT NULL DEFAULT 1,
    appointment_type appointment_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_type)
);

-- Enable RLS on weekly_schedule_limits
ALTER TABLE weekly_schedule_limits ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Anyone can view weekly limits" ON weekly_schedule_limits;
DROP POLICY IF EXISTS "Admins can manage weekly limits" ON weekly_schedule_limits;

-- Create new policies
CREATE POLICY "Anyone can view weekly limits"
    ON weekly_schedule_limits FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage weekly limits"
    ON weekly_schedule_limits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert default weekly limits
INSERT INTO weekly_schedule_limits (max_appointments_per_week, appointment_type) 
VALUES
    (1, 'physical_exam'),
    (2, 'consultation')
ON CONFLICT (appointment_type) DO NOTHING;

-- Update campuses to the correct ones
DELETE FROM campuses WHERE name NOT IN ('Main Campus', 'Paseo Campus', 'RNP Campus');

INSERT INTO campuses (name, address) VALUES 
    ('Main Campus', 'Rodolfo N. Pelaez Boulevard, Kauswagan, Cagayan de Oro City'),
    ('Paseo Campus', 'Paseo del Rio, Cagayan de Oro City'),
    ('RNP Campus', 'RNP Boulevard, Cagayan de Oro City')
ON CONFLICT (name) DO UPDATE SET address = EXCLUDED.address;

-- Add departments for each campus if not exists
INSERT INTO departments (name, campus_id)
SELECT dept.name, c.id
FROM campuses c
CROSS JOIN (
    SELECT unnest(ARRAY[
        'Human Resources',
        'Finance',
        'Information Technology',
        'Academic Affairs',
        'Student Affairs',
        'Registrar',
        'Library',
        'Maintenance',
        'Security',
        'Clinic'
    ]) as name
) dept
ON CONFLICT (name, campus_id) DO NOTHING;

-- =====================================================
-- VERIFY MIGRATION
-- =====================================================
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- =====================================================
-- MAKE ADMIN (run after signing in with Google)
-- =====================================================
-- UPDATE profiles 
-- SET role = 'admin', is_verified = true 
-- WHERE email = 'hbusa82663@liceo.edu.ph';
