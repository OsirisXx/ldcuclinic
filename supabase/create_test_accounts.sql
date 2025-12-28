-- =====================================================
-- CREATE TEST ACCOUNTS FOR EACH ROLE
-- Run this in Supabase SQL Editor
-- =====================================================

-- IMPORTANT: You need to create auth users first via Supabase Dashboard
-- Go to Authentication > Users > Add User for each account below
-- Then run this script to create their profiles

-- Test Account Credentials:
-- 1. Admin:    admin@gmail.com     / admin123
-- 2. Doctor:   doctor@gmail.com    / doctor123
-- 3. Nurse:    nurse@gmail.com     / nurse123
-- 4. Employee: employee@gmail.com  / employee123

-- After creating users in Supabase Auth, get their IDs and insert profiles:

-- Step 1: Check existing auth users
SELECT id, email FROM auth.users ORDER BY created_at;

-- Step 2: Insert profiles for each user (replace UUIDs with actual user IDs from Step 1)

-- For Admin account
INSERT INTO profiles (id, email, first_name, last_name, role, is_verified, auth_provider)
SELECT id, email, 'Admin', 'User', 'admin', true, 'email'
FROM auth.users WHERE email = 'admin@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', is_verified = true;

-- For Doctor account
INSERT INTO profiles (id, email, first_name, last_name, role, is_verified, auth_provider)
SELECT id, email, 'Doctor', 'User', 'doctor', true, 'email'
FROM auth.users WHERE email = 'doctor@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'doctor', is_verified = true;

-- For Nurse account
INSERT INTO profiles (id, email, first_name, last_name, role, is_verified, auth_provider)
SELECT id, email, 'Nurse', 'User', 'nurse', true, 'email'
FROM auth.users WHERE email = 'nurse@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'nurse', is_verified = true;

-- For Employee account
INSERT INTO profiles (id, email, first_name, last_name, role, is_verified, auth_provider)
SELECT id, email, 'Employee', 'User', 'employee', true, 'email'
FROM auth.users WHERE email = 'employee@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'employee', is_verified = true;

-- =====================================================
-- VERIFY ACCOUNTS CREATED
-- =====================================================
SELECT id, email, first_name, last_name, role, is_verified, auth_provider
FROM profiles
ORDER BY role;

-- =====================================================
-- QUICK REFERENCE: AVAILABLE ROLES
-- =====================================================
-- admin    - Full system access, can manage users and appointments
-- doctor   - Can view and manage appointments, medical staff
-- nurse    - Can view and manage appointments, medical staff  
-- employee - Regular user, can book appointments
-- =====================================================
