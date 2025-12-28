-- =====================================================
-- ADMIN ACCOUNT SETUP SCRIPT
-- Run this AFTER hbusa82663@liceo.edu.ph signs up via Google Auth
-- =====================================================

-- Option 1: If the user already exists in profiles table
-- This will make them an admin and verify their account
UPDATE profiles 
SET role = 'admin', is_verified = true 
WHERE email = 'hbusa82663@liceo.edu.ph';

-- Option 2: Check if the update was successful
SELECT id, email, first_name, last_name, role, is_verified 
FROM profiles 
WHERE email = 'hbusa82663@liceo.edu.ph';

-- =====================================================
-- ALTERNATIVE: If you need to manually insert the admin
-- (Only use if the profile wasn't created automatically)
-- =====================================================

-- First, get the user ID from auth.users:
-- SELECT id, email FROM auth.users WHERE email = 'hbusa82663@liceo.edu.ph';

-- Then insert with that ID:
-- INSERT INTO profiles (id, email, first_name, last_name, role, is_verified, auth_provider)
-- VALUES (
--     'PASTE_USER_ID_HERE',
--     'hbusa82663@liceo.edu.ph',
--     'Admin',
--     'User',
--     'admin',
--     true,
--     'google'
-- );

-- =====================================================
-- VERIFY ADMIN SETUP
-- =====================================================

-- Check all admins in the system
SELECT id, email, first_name, last_name, role, is_verified, auth_provider, created_at
FROM profiles
WHERE role = 'admin';
