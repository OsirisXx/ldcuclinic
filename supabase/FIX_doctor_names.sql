-- =====================================================
-- FIX DOCTOR NAMES
-- Check what's in doctors table and fix profile names
-- =====================================================

-- First, see what doctors exist and their profile data
SELECT 'Current doctors and their profiles:' as info;
SELECT 
    d.id as doctor_id,
    d.profile_id,
    d.specialization,
    p.email,
    p.first_name,
    p.last_name,
    p.role
FROM doctors d
LEFT JOIN profiles p ON d.profile_id = p.id;

-- See all profiles
SELECT 'All profiles:' as info;
SELECT id, email, first_name, last_name, role FROM profiles;

-- See all auth users
SELECT 'All auth users:' as info;
SELECT id, email FROM auth.users;

-- =====================================================
-- UPDATE: Set names for doctor profiles that have NULL names
-- =====================================================
UPDATE profiles SET first_name = 'Maria', last_name = 'Santos' 
WHERE email = 'doctor@test.com' AND (first_name IS NULL OR first_name = '');

UPDATE profiles SET first_name = 'Juan', last_name = 'Reyes' 
WHERE email = 'doctor1@test.com' AND (first_name IS NULL OR first_name = '');

UPDATE profiles SET first_name = 'Ana', last_name = 'Garcia' 
WHERE email = 'doctor2@test.com' AND (first_name IS NULL OR first_name = '');

UPDATE profiles SET first_name = 'Carlos', last_name = 'Mendoza' 
WHERE email = 'doctor3@test.com' AND (first_name IS NULL OR first_name = '');

UPDATE profiles SET first_name = 'Elena', last_name = 'Cruz' 
WHERE email = 'doctor4@test.com' AND (first_name IS NULL OR first_name = '');

UPDATE profiles SET first_name = 'Rosa', last_name = 'Dela Cruz' 
WHERE email = 'nurse@test.com' AND (first_name IS NULL OR first_name = '');

UPDATE profiles SET first_name = 'Liza', last_name = 'Santos' 
WHERE email = 'nurse1@test.com' AND (first_name IS NULL OR first_name = '');

UPDATE profiles SET first_name = 'Jose', last_name = 'Ramirez' 
WHERE email = 'employee@test.com' AND (first_name IS NULL OR first_name = '');

UPDATE profiles SET first_name = 'Carmen', last_name = 'Flores' 
WHERE email = 'employee1@test.com' AND (first_name IS NULL OR first_name = '');

UPDATE profiles SET first_name = 'Ricardo', last_name = 'Morales' 
WHERE email = 'employee2@test.com' AND (first_name IS NULL OR first_name = '');

-- Also make sure doctor profiles have role = 'doctor'
UPDATE profiles SET role = 'doctor' WHERE email LIKE 'doctor%@test.com';
UPDATE profiles SET role = 'nurse' WHERE email LIKE 'nurse%@test.com';

-- Verify the fix
SELECT 'Fixed doctors:' as info;
SELECT 
    d.id as doctor_id,
    p.first_name,
    p.last_name,
    p.email,
    d.specialization
FROM doctors d
JOIN profiles p ON d.profile_id = p.id;
