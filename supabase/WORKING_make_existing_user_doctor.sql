-- =====================================================
-- MAKE YOUR EXISTING USER A DOCTOR
-- This is the ONLY thing that will work via SQL
-- because profiles.id references auth.users
-- =====================================================

-- Step 1: Create Clinic department
INSERT INTO departments (name, campus_id) 
SELECT 'Clinic', id FROM campuses LIMIT 1
ON CONFLICT DO NOTHING;

-- Step 2: Update your existing profile to doctor role
UPDATE profiles 
SET role = 'doctor', 
    department_id = (SELECT id FROM departments WHERE name = 'Clinic' LIMIT 1),
    is_verified = true
WHERE id = '2c148e87-0653-431c-90ac-30c81724c72a';

-- Step 3: Add to doctors table
INSERT INTO doctors (profile_id, specialization, license_number, campus_id, is_active)
VALUES (
    '2c148e87-0653-431c-90ac-30c81724c72a', 
    'General Medicine', 
    'PRC-MD-2024-001', 
    (SELECT id FROM campuses LIMIT 1), 
    true
)
ON CONFLICT (profile_id) DO UPDATE SET specialization = EXCLUDED.specialization;

-- Step 4: Setup schedule settings
INSERT INTO schedule_settings (campus_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments_per_slot, appointment_type, is_active)
SELECT 
    id, day, '08:00:00', '17:00:00', 30, 20, type, true
FROM campuses, 
    (VALUES (1), (2), (3), (4), (5)) AS days(day),
    (VALUES ('consultation'::appointment_type), ('physical_exam'::appointment_type)) AS types(type)
LIMIT 1
ON CONFLICT DO NOTHING;

-- Step 5: Update weekly limits to 20
UPDATE weekly_schedule_limits SET max_appointments_per_week = 20;

-- Verify
SELECT 'Your profile is now a doctor:' as info;
SELECT id, email, first_name, last_name, role FROM profiles WHERE id = '2c148e87-0653-431c-90ac-30c81724c72a';

SELECT 'Doctors table:' as info;
SELECT * FROM doctors;
