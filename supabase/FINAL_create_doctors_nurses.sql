-- =====================================================
-- CREATE DOCTORS AND NURSES FROM EXISTING AUTH USERS
-- Using the actual UUIDs from your Supabase Auth
-- =====================================================

-- Step 1: Create Clinic department
INSERT INTO departments (name, campus_id) 
SELECT 'Clinic', id FROM campuses LIMIT 1
ON CONFLICT DO NOTHING;

-- Step 2: Create profiles for all doctors (if not exist)
DO $$
DECLARE
    v_campus_id UUID;
    v_dept_id UUID;
BEGIN
    SELECT id INTO v_campus_id FROM campuses LIMIT 1;
    SELECT id INTO v_dept_id FROM departments WHERE name = 'Clinic' LIMIT 1;

    -- Doctor 1: doctor@test.com
    INSERT INTO profiles (id, email, first_name, last_name, role, department_id, campus_id, is_verified, auth_provider)
    VALUES ('e0307373-185a-4c8e-acdc-86c02e00ca65', 'doctor@test.com', 'Maria', 'Santos', 'doctor', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', first_name = 'Maria', last_name = 'Santos', department_id = v_dept_id;

    -- Doctor 2: doctor1@test.com
    INSERT INTO profiles (id, email, first_name, last_name, role, department_id, campus_id, is_verified, auth_provider)
    VALUES ('b57727d0-9e8e-44bd-9d1b-1e3f5e14ccff', 'doctor1@test.com', 'Juan', 'Reyes', 'doctor', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', first_name = 'Juan', last_name = 'Reyes', department_id = v_dept_id;

    -- Doctor 3: doctor2@test.com
    INSERT INTO profiles (id, email, first_name, last_name, role, department_id, campus_id, is_verified, auth_provider)
    VALUES ('a3658cdd-5b25-4ae8-b71b-9c607a6bb225', 'doctor2@test.com', 'Ana', 'Garcia', 'doctor', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', first_name = 'Ana', last_name = 'Garcia', department_id = v_dept_id;

    -- Doctor 4: doctor3@test.com
    INSERT INTO profiles (id, email, first_name, last_name, role, department_id, campus_id, is_verified, auth_provider)
    VALUES ('6f260830-1d18-450f-85ae-2b58bcd7d019', 'doctor3@test.com', 'Carlos', 'Mendoza', 'doctor', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', first_name = 'Carlos', last_name = 'Mendoza', department_id = v_dept_id;

    -- Doctor 5: doctor4@test.com
    INSERT INTO profiles (id, email, first_name, last_name, role, department_id, campus_id, is_verified, auth_provider)
    VALUES ('38bee1cd-8e7a-4396-8ef1-87d2b81af723', 'doctor4@test.com', 'Elena', 'Cruz', 'doctor', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', first_name = 'Elena', last_name = 'Cruz', department_id = v_dept_id;

    -- Employee 1: employee@test.com
    INSERT INTO profiles (id, email, first_name, last_name, role, department_id, campus_id, is_verified, auth_provider)
    VALUES ('4fbe0a79-4b1f-42e9-88c3-074dcc2884f5', 'employee@test.com', 'Jose', 'Ramirez', 'employee', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET role = 'employee', first_name = 'Jose', last_name = 'Ramirez';

    -- Employee 2: employee1@test.com
    INSERT INTO profiles (id, email, first_name, last_name, role, department_id, campus_id, is_verified, auth_provider)
    VALUES ('21f562a9-caac-4846-816d-1fe9b5a92cbf', 'employee1@test.com', 'Carmen', 'Flores', 'employee', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET role = 'employee', first_name = 'Carmen', last_name = 'Flores';

    -- Employee 3: employee2@test.com
    INSERT INTO profiles (id, email, first_name, last_name, role, department_id, campus_id, is_verified, auth_provider)
    VALUES ('90487343-e474-4a1f-9e9f-1f7fb141f25f', 'employee2@test.com', 'Ricardo', 'Morales', 'employee', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET role = 'employee', first_name = 'Ricardo', last_name = 'Morales';

    -- Nurse 1: nurse@test.com
    INSERT INTO profiles (id, email, first_name, last_name, role, department_id, campus_id, is_verified, auth_provider)
    VALUES ('2485d3cd-c05e-4c1f-bd2e-4dabb300fda4', 'nurse@test.com', 'Rosa', 'Dela Cruz', 'nurse', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET role = 'nurse', first_name = 'Rosa', last_name = 'Dela Cruz', department_id = v_dept_id;

    -- Nurse 2: nurse1@test.com
    INSERT INTO profiles (id, email, first_name, last_name, role, department_id, campus_id, is_verified, auth_provider)
    VALUES ('6808c505-1cb5-43cc-990b-fcb233c82d6c', 'nurse1@test.com', 'Liza', 'Santos', 'nurse', v_dept_id, v_campus_id, true, 'email')
    ON CONFLICT (id) DO UPDATE SET role = 'nurse', first_name = 'Liza', last_name = 'Santos', department_id = v_dept_id;

END $$;

-- Step 3: Add doctors to doctors table
DO $$
DECLARE
    v_campus_id UUID;
BEGIN
    SELECT id INTO v_campus_id FROM campuses LIMIT 1;

    INSERT INTO doctors (profile_id, specialization, license_number, campus_id, is_active)
    VALUES 
        ('e0307373-185a-4c8e-acdc-86c02e00ca65', 'General Medicine', 'PRC-MD-2001-001', v_campus_id, true),
        ('b57727d0-9e8e-44bd-9d1b-1e3f5e14ccff', 'Internal Medicine', 'PRC-MD-2002-002', v_campus_id, true),
        ('a3658cdd-5b25-4ae8-b71b-9c607a6bb225', 'Pediatrics', 'PRC-MD-2003-003', v_campus_id, true),
        ('6f260830-1d18-450f-85ae-2b58bcd7d019', 'Family Medicine', 'PRC-MD-2004-004', v_campus_id, true),
        ('38bee1cd-8e7a-4396-8ef1-87d2b81af723', 'Occupational Medicine', 'PRC-MD-2005-005', v_campus_id, true)
    ON CONFLICT (profile_id) DO UPDATE SET specialization = EXCLUDED.specialization;
END $$;

-- Step 4: Add nurses to nurses table
DO $$
DECLARE
    v_campus_id UUID;
BEGIN
    SELECT id INTO v_campus_id FROM campuses LIMIT 1;

    INSERT INTO nurses (profile_id, license_number, campus_id, is_active)
    VALUES 
        ('2485d3cd-c05e-4c1f-bd2e-4dabb300fda4', 'PRC-RN-2010-001', v_campus_id, true),
        ('6808c505-1cb5-43cc-990b-fcb233c82d6c', 'PRC-RN-2012-002', v_campus_id, true)
    ON CONFLICT (profile_id) DO UPDATE SET license_number = EXCLUDED.license_number;
END $$;

-- Step 5: Setup schedule settings
DO $$
DECLARE
    v_campus_id UUID;
BEGIN
    SELECT id INTO v_campus_id FROM campuses LIMIT 1;
    
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
END $$;

-- Step 6: Update weekly limits to 20
UPDATE weekly_schedule_limits SET max_appointments_per_week = 20;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'All Profiles:' as info;
SELECT id, email, first_name, last_name, role FROM profiles ORDER BY role, last_name;

SELECT 'All Doctors:' as info;
SELECT p.first_name, p.last_name, p.email, d.specialization 
FROM doctors d 
JOIN profiles p ON d.profile_id = p.id;

SELECT 'All Nurses:' as info;
SELECT p.first_name, p.last_name, p.email, n.license_number 
FROM nurses n 
JOIN profiles p ON n.profile_id = p.id;

SELECT 'Schedule Settings:' as info;
SELECT * FROM schedule_settings;

SELECT 'Weekly Limits:' as info;
SELECT * FROM weekly_schedule_limits;
