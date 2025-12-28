-- =====================================================
-- SETUP SCHEDULE SETTINGS AND WEEKLY LIMITS
-- This SQL does NOT create users (they must be created via Supabase Auth)
-- Run in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Create departments (if not exist)
-- =====================================================
INSERT INTO departments (name, campus_id) 
SELECT 'Human Resources', id FROM campuses LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO departments (name, campus_id) 
SELECT 'Finance', id FROM campuses LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO departments (name, campus_id) 
SELECT 'IT Department', id FROM campuses LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO departments (name, campus_id) 
SELECT 'Administration', id FROM campuses LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO departments (name, campus_id) 
SELECT 'Clinic', id FROM campuses LIMIT 1
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 2: Update Weekly Limits to 20 per week
-- =====================================================
UPDATE weekly_schedule_limits 
SET max_appointments_per_week = 20 
WHERE appointment_type IN ('physical_exam', 'consultation');

-- If no limits exist, insert them
INSERT INTO weekly_schedule_limits (max_appointments_per_week, appointment_type)
SELECT 20, 'consultation'
WHERE NOT EXISTS (SELECT 1 FROM weekly_schedule_limits WHERE appointment_type = 'consultation');

INSERT INTO weekly_schedule_limits (max_appointments_per_week, appointment_type)
SELECT 20, 'physical_exam'
WHERE NOT EXISTS (SELECT 1 FROM weekly_schedule_limits WHERE appointment_type = 'physical_exam');

-- =====================================================
-- STEP 3: Create Schedule Settings (Mon-Fri 8am-5pm)
-- =====================================================
DO $$
DECLARE
    v_campus_id UUID;
BEGIN
    SELECT id INTO v_campus_id FROM campuses LIMIT 1;
    
    IF v_campus_id IS NOT NULL THEN
        -- Consultation slots
        INSERT INTO schedule_settings (campus_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments_per_slot, appointment_type, is_active)
        VALUES 
            (v_campus_id, 1, '08:00:00', '17:00:00', 30, 20, 'consultation', true),
            (v_campus_id, 2, '08:00:00', '17:00:00', 30, 20, 'consultation', true),
            (v_campus_id, 3, '08:00:00', '17:00:00', 30, 20, 'consultation', true),
            (v_campus_id, 4, '08:00:00', '17:00:00', 30, 20, 'consultation', true),
            (v_campus_id, 5, '08:00:00', '17:00:00', 30, 20, 'consultation', true),
            (v_campus_id, 1, '08:00:00', '17:00:00', 30, 20, 'physical_exam', true),
            (v_campus_id, 2, '08:00:00', '17:00:00', 30, 20, 'physical_exam', true),
            (v_campus_id, 3, '08:00:00', '17:00:00', 30, 20, 'physical_exam', true),
            (v_campus_id, 4, '08:00:00', '17:00:00', 30, 20, 'physical_exam', true),
            (v_campus_id, 5, '08:00:00', '17:00:00', 30, 20, 'physical_exam', true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'Weekly Limits:' as info;
SELECT * FROM weekly_schedule_limits;

SELECT 'Schedule Settings:' as info;
SELECT s.*, c.name as campus_name 
FROM schedule_settings s 
JOIN campuses c ON s.campus_id = c.id
ORDER BY day_of_week, appointment_type;

SELECT 'Departments:' as info;
SELECT * FROM departments;

-- =====================================================
-- TO MAKE AN EXISTING USER A DOCTOR:
-- Replace 'YOUR_USER_ID' with the actual user ID from profiles table
-- =====================================================
-- INSERT INTO doctors (profile_id, specialization, license_number, campus_id, is_active)
-- SELECT 
--     'YOUR_USER_ID',
--     'General Medicine',
--     'PRC-MD-2024-001',
--     (SELECT id FROM campuses LIMIT 1),
--     true
-- WHERE EXISTS (SELECT 1 FROM profiles WHERE id = 'YOUR_USER_ID');
--
-- UPDATE profiles SET role = 'doctor' WHERE id = 'YOUR_USER_ID';

-- =====================================================
-- TO SEE EXISTING PROFILES (to get user IDs):
-- =====================================================
SELECT 'Existing Profiles:' as info;
SELECT id, email, first_name, last_name, role FROM profiles;
