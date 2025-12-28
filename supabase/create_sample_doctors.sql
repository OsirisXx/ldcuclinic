-- =====================================================
-- CREATE SAMPLE DOCTORS AND NURSES
-- This uses auth.users() to create real auth users first
-- Run in Supabase SQL Editor
-- =====================================================

-- First, let's make YOUR existing user a doctor so you have at least one
-- Your user ID: 2c148e87-0653-431c-90ac-30c81724c72a

-- =====================================================
-- STEP 1: Create Clinic department if not exists
-- =====================================================
INSERT INTO departments (name, campus_id) 
SELECT 'Clinic', id FROM campuses LIMIT 1
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 2: Make your existing user (HARLEY BUSA) a doctor
-- =====================================================
DO $$
DECLARE
    v_campus_id UUID;
    v_dept_id UUID;
    v_user_id UUID := '2c148e87-0653-431c-90ac-30c81724c72a';
BEGIN
    SELECT id INTO v_campus_id FROM campuses LIMIT 1;
    SELECT id INTO v_dept_id FROM departments WHERE name = 'Clinic' LIMIT 1;
    
    -- Update profile to doctor role
    UPDATE profiles 
    SET role = 'doctor', 
        department_id = v_dept_id,
        is_verified = true
    WHERE id = v_user_id;
    
    -- Insert into doctors table (if not already there)
    INSERT INTO doctors (profile_id, specialization, license_number, campus_id, is_active)
    VALUES (v_user_id, 'General Medicine', 'PRC-MD-2024-001', v_campus_id, true)
    ON CONFLICT (profile_id) DO UPDATE SET specialization = EXCLUDED.specialization;
    
    RAISE NOTICE 'Made user % a doctor', v_user_id;
END $$;

-- =====================================================
-- STEP 3: Create additional doctors using raw auth insert
-- WARNING: This bypasses normal auth flow - for testing only!
-- =====================================================
DO $$
DECLARE
    v_campus_id UUID;
    v_dept_id UUID;
    v_user_id UUID;
BEGIN
    SELECT id INTO v_campus_id FROM campuses LIMIT 1;
    SELECT id INTO v_dept_id FROM departments WHERE name = 'Clinic' LIMIT 1;
    
    -- Create Doctor 1: Dr. Maria Santos
    v_user_id := 'd0000001-0000-0000-0000-000000000001';
    
    -- Insert into auth.users (requires service_role key or being run as postgres)
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'dr.santos@liceo.edu.ph',
        crypt('Doctor123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Maria Santos"}',
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Insert profile
    INSERT INTO profiles (id, email, first_name, last_name, middle_name, date_of_birth, sex, contact_number, role, department_id, campus_id, is_verified, auth_provider)
    VALUES (v_user_id, 'dr.santos@liceo.edu.ph', 'Maria', 'Santos', 'Cruz', '1975-03-15', 'female', '09171234501', 'doctor', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name;
    
    -- Insert into doctors table
    INSERT INTO doctors (profile_id, specialization, license_number, campus_id, is_active)
    VALUES (v_user_id, 'General Medicine', 'PRC-MD-2001-001', v_campus_id, true)
    ON CONFLICT (profile_id) DO UPDATE SET specialization = EXCLUDED.specialization;

    -- Create Doctor 2: Dr. Juan Reyes
    v_user_id := 'd0000001-0000-0000-0000-000000000002';
    
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'dr.reyes@liceo.edu.ph',
        crypt('Doctor123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Juan Reyes"}',
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO profiles (id, email, first_name, last_name, middle_name, date_of_birth, sex, contact_number, role, department_id, campus_id, is_verified, auth_provider)
    VALUES (v_user_id, 'dr.reyes@liceo.edu.ph', 'Juan', 'Reyes', 'Dela', '1980-07-22', 'male', '09171234502', 'doctor', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name;
    
    INSERT INTO doctors (profile_id, specialization, license_number, campus_id, is_active)
    VALUES (v_user_id, 'Internal Medicine', 'PRC-MD-2002-002', v_campus_id, true)
    ON CONFLICT (profile_id) DO UPDATE SET specialization = EXCLUDED.specialization;

    -- Create Doctor 3: Dr. Ana Garcia
    v_user_id := 'd0000001-0000-0000-0000-000000000003';
    
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'dr.garcia@liceo.edu.ph',
        crypt('Doctor123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Ana Garcia"}',
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO profiles (id, email, first_name, last_name, middle_name, date_of_birth, sex, contact_number, role, department_id, campus_id, is_verified, auth_provider)
    VALUES (v_user_id, 'dr.garcia@liceo.edu.ph', 'Ana', 'Garcia', 'Lim', '1978-11-08', 'female', '09171234503', 'doctor', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name;
    
    INSERT INTO doctors (profile_id, specialization, license_number, campus_id, is_active)
    VALUES (v_user_id, 'Pediatrics', 'PRC-MD-2003-003', v_campus_id, true)
    ON CONFLICT (profile_id) DO UPDATE SET specialization = EXCLUDED.specialization;

    -- Create Doctor 4: Dr. Carlos Mendoza
    v_user_id := 'd0000001-0000-0000-0000-000000000004';
    
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'dr.mendoza@liceo.edu.ph',
        crypt('Doctor123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Carlos Mendoza"}',
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO profiles (id, email, first_name, last_name, middle_name, date_of_birth, sex, contact_number, role, department_id, campus_id, is_verified, auth_provider)
    VALUES (v_user_id, 'dr.mendoza@liceo.edu.ph', 'Carlos', 'Mendoza', 'Tan', '1982-05-30', 'male', '09171234504', 'doctor', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name;
    
    INSERT INTO doctors (profile_id, specialization, license_number, campus_id, is_active)
    VALUES (v_user_id, 'Family Medicine', 'PRC-MD-2004-004', v_campus_id, true)
    ON CONFLICT (profile_id) DO UPDATE SET specialization = EXCLUDED.specialization;

    -- Create Doctor 5: Dr. Elena Cruz
    v_user_id := 'd0000001-0000-0000-0000-000000000005';
    
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'dr.cruz@liceo.edu.ph',
        crypt('Doctor123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Elena Cruz"}',
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO profiles (id, email, first_name, last_name, middle_name, date_of_birth, sex, contact_number, role, department_id, campus_id, is_verified, auth_provider)
    VALUES (v_user_id, 'dr.cruz@liceo.edu.ph', 'Elena', 'Cruz', 'Bautista', '1976-09-12', 'female', '09171234505', 'doctor', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name;
    
    INSERT INTO doctors (profile_id, specialization, license_number, campus_id, is_active)
    VALUES (v_user_id, 'Occupational Medicine', 'PRC-MD-2005-005', v_campus_id, true)
    ON CONFLICT (profile_id) DO UPDATE SET specialization = EXCLUDED.specialization;

    RAISE NOTICE 'Created 5 sample doctors';
END $$;

-- =====================================================
-- STEP 4: Create Nurses
-- =====================================================
DO $$
DECLARE
    v_campus_id UUID;
    v_dept_id UUID;
    v_user_id UUID;
BEGIN
    SELECT id INTO v_campus_id FROM campuses LIMIT 1;
    SELECT id INTO v_dept_id FROM departments WHERE name = 'Clinic' LIMIT 1;
    
    -- Create Nurse 1: Rosa Dela Cruz
    v_user_id := 'n0000001-0000-0000-0000-000000000001';
    
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'nurse.delacruz@liceo.edu.ph',
        crypt('Nurse123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Rosa Dela Cruz"}',
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO profiles (id, email, first_name, last_name, middle_name, date_of_birth, sex, contact_number, role, department_id, campus_id, is_verified, auth_provider)
    VALUES (v_user_id, 'nurse.delacruz@liceo.edu.ph', 'Rosa', 'Dela Cruz', 'Maria', '1985-02-14', 'female', '09181234501', 'nurse', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name;
    
    INSERT INTO nurses (profile_id, license_number, campus_id, is_active)
    VALUES (v_user_id, 'PRC-RN-2010-001', v_campus_id, true)
    ON CONFLICT (profile_id) DO UPDATE SET license_number = EXCLUDED.license_number;

    -- Create Nurse 2: Liza Santos
    v_user_id := 'n0000001-0000-0000-0000-000000000002';
    
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'nurse.santos@liceo.edu.ph',
        crypt('Nurse123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Liza Santos"}',
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO profiles (id, email, first_name, last_name, middle_name, date_of_birth, sex, contact_number, role, department_id, campus_id, is_verified, auth_provider)
    VALUES (v_user_id, 'nurse.santos@liceo.edu.ph', 'Liza', 'Santos', 'Ann', '1988-06-20', 'female', '09181234502', 'nurse', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name;
    
    INSERT INTO nurses (profile_id, license_number, campus_id, is_active)
    VALUES (v_user_id, 'PRC-RN-2012-002', v_campus_id, true)
    ON CONFLICT (profile_id) DO UPDATE SET license_number = EXCLUDED.license_number;

    -- Create Nurse 3: Mark Reyes
    v_user_id := 'n0000001-0000-0000-0000-000000000003';
    
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'nurse.reyes@liceo.edu.ph',
        crypt('Nurse123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Mark Reyes"}',
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO profiles (id, email, first_name, last_name, middle_name, date_of_birth, sex, contact_number, role, department_id, campus_id, is_verified, auth_provider)
    VALUES (v_user_id, 'nurse.reyes@liceo.edu.ph', 'Mark', 'Reyes', 'Joseph', '1990-10-05', 'male', '09181234503', 'nurse', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name;
    
    INSERT INTO nurses (profile_id, license_number, campus_id, is_active)
    VALUES (v_user_id, 'PRC-RN-2014-003', v_campus_id, true)
    ON CONFLICT (profile_id) DO UPDATE SET license_number = EXCLUDED.license_number;

    RAISE NOTICE 'Created 3 sample nurses';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'All Profiles:' as info;
SELECT id, email, first_name, last_name, role FROM profiles ORDER BY role, last_name;

SELECT 'All Doctors:' as info;
SELECT p.first_name, p.last_name, d.specialization, d.license_number 
FROM doctors d 
JOIN profiles p ON d.profile_id = p.id;

SELECT 'All Nurses:' as info;
SELECT p.first_name, p.last_name, n.license_number 
FROM nurses n 
JOIN profiles p ON n.profile_id = p.id;
