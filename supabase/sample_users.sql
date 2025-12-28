-- =====================================================
-- SAMPLE USERS SQL SNIPPETS FOR LICEO CLINIC
-- Run these in Supabase SQL Editor
-- =====================================================

-- IMPORTANT: This script uses your EXISTING campus data
-- It will automatically find your first campus and use it

-- =====================================================
-- STEP 1: Get existing campus ID (uses first available campus)
-- =====================================================
DO $$
DECLARE
    v_campus_id UUID;
BEGIN
    -- Get the first existing campus
    SELECT id INTO v_campus_id FROM campuses LIMIT 1;
    
    IF v_campus_id IS NULL THEN
        RAISE EXCEPTION 'No campus found. Please create a campus first.';
    END IF;
    
    RAISE NOTICE 'Using campus ID: %', v_campus_id;
END $$;

-- =====================================================
-- STEP 2: Create departments using existing campus
-- =====================================================
INSERT INTO departments (id, name, campus_id) 
SELECT 
    '22222222-2222-2222-2222-222222222221'::uuid, 
    'Human Resources', 
    (SELECT id FROM campuses LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Human Resources');

INSERT INTO departments (id, name, campus_id) 
SELECT 
    '22222222-2222-2222-2222-222222222222'::uuid, 
    'Finance', 
    (SELECT id FROM campuses LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Finance');

INSERT INTO departments (id, name, campus_id) 
SELECT 
    '22222222-2222-2222-2222-222222222223'::uuid, 
    'IT Department', 
    (SELECT id FROM campuses LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'IT Department');

INSERT INTO departments (id, name, campus_id) 
SELECT 
    '22222222-2222-2222-2222-222222222224'::uuid, 
    'Administration', 
    (SELECT id FROM campuses LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Administration');

INSERT INTO departments (id, name, campus_id) 
SELECT 
    '22222222-2222-2222-2222-222222222225'::uuid, 
    'Clinic', 
    (SELECT id FROM campuses LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Clinic');

-- =====================================================
-- STEP 3: 10 DOCTORS (profiles + doctors table)
-- =====================================================

-- Doctor Profiles
INSERT INTO profiles (id, email, first_name, last_name, middle_name, date_of_birth, sex, contact_number, user_type, role, department_id, campus_id) VALUES
    ('d0000001-0000-0000-0000-000000000001', 'dr.santos@liceo.edu.ph', 'Maria', 'Santos', 'Cruz', '1975-03-15', 'female', '09171234501', 'employee', 'doctor', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('d0000001-0000-0000-0000-000000000002', 'dr.reyes@liceo.edu.ph', 'Juan', 'Reyes', 'Dela', '1980-07-22', 'male', '09171234502', 'employee', 'doctor', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('d0000001-0000-0000-0000-000000000003', 'dr.garcia@liceo.edu.ph', 'Ana', 'Garcia', 'Lim', '1978-11-08', 'female', '09171234503', 'employee', 'doctor', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('d0000001-0000-0000-0000-000000000004', 'dr.mendoza@liceo.edu.ph', 'Carlos', 'Mendoza', 'Tan', '1982-05-30', 'male', '09171234504', 'employee', 'doctor', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('d0000001-0000-0000-0000-000000000005', 'dr.cruz@liceo.edu.ph', 'Elena', 'Cruz', 'Bautista', '1976-09-12', 'female', '09171234505', 'employee', 'doctor', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('d0000001-0000-0000-0000-000000000006', 'dr.torres@liceo.edu.ph', 'Miguel', 'Torres', 'Ramos', '1979-01-25', 'male', '09171234506', 'employee', 'doctor', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('d0000001-0000-0000-0000-000000000007', 'dr.villanueva@liceo.edu.ph', 'Sofia', 'Villanueva', 'Ocampo', '1983-04-18', 'female', '09171234507', 'employee', 'doctor', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('d0000001-0000-0000-0000-000000000008', 'dr.fernandez@liceo.edu.ph', 'Roberto', 'Fernandez', 'Aquino', '1977-08-05', 'male', '09171234508', 'employee', 'doctor', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('d0000001-0000-0000-0000-000000000009', 'dr.gonzales@liceo.edu.ph', 'Patricia', 'Gonzales', 'Sy', '1981-12-20', 'female', '09171234509', 'employee', 'doctor', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('d0000001-0000-0000-0000-000000000010', 'dr.lopez@liceo.edu.ph', 'Antonio', 'Lopez', 'Chua', '1974-06-10', 'male', '09171234510', 'employee', 'doctor', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- Doctors Table Entries
INSERT INTO doctors (id, profile_id, specialization, license_number, campus_id, is_active) VALUES
    ('doc00001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'General Medicine', 'PRC-MD-2001-001', '11111111-1111-1111-1111-111111111111', true),
    ('doc00001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000002', 'Internal Medicine', 'PRC-MD-2002-002', '11111111-1111-1111-1111-111111111111', true),
    ('doc00001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000003', 'Pediatrics', 'PRC-MD-2003-003', '11111111-1111-1111-1111-111111111111', true),
    ('doc00001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000004', 'Family Medicine', 'PRC-MD-2004-004', '11111111-1111-1111-1111-111111111111', true),
    ('doc00001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000005', 'Occupational Medicine', 'PRC-MD-2005-005', '11111111-1111-1111-1111-111111111111', true),
    ('doc00001-0000-0000-0000-000000000006', 'd0000001-0000-0000-0000-000000000006', 'General Medicine', 'PRC-MD-2006-006', '11111111-1111-1111-1111-111111111111', true),
    ('doc00001-0000-0000-0000-000000000007', 'd0000001-0000-0000-0000-000000000007', 'Internal Medicine', 'PRC-MD-2007-007', '11111111-1111-1111-1111-111111111111', true),
    ('doc00001-0000-0000-0000-000000000008', 'd0000001-0000-0000-0000-000000000008', 'General Medicine', 'PRC-MD-2008-008', '11111111-1111-1111-1111-111111111111', true),
    ('doc00001-0000-0000-0000-000000000009', 'd0000001-0000-0000-0000-000000000009', 'Family Medicine', 'PRC-MD-2009-009', '11111111-1111-1111-1111-111111111111', true),
    ('doc00001-0000-0000-0000-000000000010', 'd0000001-0000-0000-0000-000000000010', 'Occupational Medicine', 'PRC-MD-2010-010', '11111111-1111-1111-1111-111111111111', true)
ON CONFLICT (id) DO UPDATE SET
    specialization = EXCLUDED.specialization,
    is_active = EXCLUDED.is_active;

-- =====================================================
-- STEP 4: 10 NURSES (profiles + nurses table)
-- =====================================================

-- Nurse Profiles
INSERT INTO profiles (id, email, first_name, last_name, middle_name, date_of_birth, sex, contact_number, user_type, role, department_id, campus_id) VALUES
    ('n0000001-0000-0000-0000-000000000001', 'nurse.dela.cruz@liceo.edu.ph', 'Rosa', 'Dela Cruz', 'Maria', '1985-02-14', 'female', '09181234501', 'employee', 'nurse', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('n0000001-0000-0000-0000-000000000002', 'nurse.santos@liceo.edu.ph', 'Liza', 'Santos', 'Ann', '1988-06-20', 'female', '09181234502', 'employee', 'nurse', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('n0000001-0000-0000-0000-000000000003', 'nurse.reyes@liceo.edu.ph', 'Mark', 'Reyes', 'Joseph', '1990-10-05', 'male', '09181234503', 'employee', 'nurse', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('n0000001-0000-0000-0000-000000000004', 'nurse.garcia@liceo.edu.ph', 'Jenny', 'Garcia', 'Rose', '1987-03-28', 'female', '09181234504', 'employee', 'nurse', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('n0000001-0000-0000-0000-000000000005', 'nurse.mendoza@liceo.edu.ph', 'Paolo', 'Mendoza', 'Luis', '1992-07-15', 'male', '09181234505', 'employee', 'nurse', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('n0000001-0000-0000-0000-000000000006', 'nurse.cruz@liceo.edu.ph', 'Anna', 'Cruz', 'Mae', '1986-11-30', 'female', '09181234506', 'employee', 'nurse', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('n0000001-0000-0000-0000-000000000007', 'nurse.torres@liceo.edu.ph', 'Kevin', 'Torres', 'James', '1991-04-22', 'male', '09181234507', 'employee', 'nurse', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('n0000001-0000-0000-0000-000000000008', 'nurse.villanueva@liceo.edu.ph', 'Grace', 'Villanueva', 'Faith', '1989-08-08', 'female', '09181234508', 'employee', 'nurse', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('n0000001-0000-0000-0000-000000000009', 'nurse.fernandez@liceo.edu.ph', 'Ryan', 'Fernandez', 'Paul', '1993-01-12', 'male', '09181234509', 'employee', 'nurse', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111'),
    ('n0000001-0000-0000-0000-000000000010', 'nurse.gonzales@liceo.edu.ph', 'Michelle', 'Gonzales', 'Joy', '1984-09-25', 'female', '09181234510', 'employee', 'nurse', '22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- Nurses Table Entries
INSERT INTO nurses (id, profile_id, license_number, campus_id, is_active) VALUES
    ('nur00001-0000-0000-0000-000000000001', 'n0000001-0000-0000-0000-000000000001', 'PRC-RN-2010-001', '11111111-1111-1111-1111-111111111111', true),
    ('nur00001-0000-0000-0000-000000000002', 'n0000001-0000-0000-0000-000000000002', 'PRC-RN-2012-002', '11111111-1111-1111-1111-111111111111', true),
    ('nur00001-0000-0000-0000-000000000003', 'n0000001-0000-0000-0000-000000000003', 'PRC-RN-2014-003', '11111111-1111-1111-1111-111111111111', true),
    ('nur00001-0000-0000-0000-000000000004', 'n0000001-0000-0000-0000-000000000004', 'PRC-RN-2011-004', '11111111-1111-1111-1111-111111111111', true),
    ('nur00001-0000-0000-0000-000000000005', 'n0000001-0000-0000-0000-000000000005', 'PRC-RN-2016-005', '11111111-1111-1111-1111-111111111111', true),
    ('nur00001-0000-0000-0000-000000000006', 'n0000001-0000-0000-0000-000000000006', 'PRC-RN-2010-006', '11111111-1111-1111-1111-111111111111', true),
    ('nur00001-0000-0000-0000-000000000007', 'n0000001-0000-0000-0000-000000000007', 'PRC-RN-2015-007', '11111111-1111-1111-1111-111111111111', true),
    ('nur00001-0000-0000-0000-000000000008', 'n0000001-0000-0000-0000-000000000008', 'PRC-RN-2013-008', '11111111-1111-1111-1111-111111111111', true),
    ('nur00001-0000-0000-0000-000000000009', 'n0000001-0000-0000-0000-000000000009', 'PRC-RN-2017-009', '11111111-1111-1111-1111-111111111111', true),
    ('nur00001-0000-0000-0000-000000000010', 'n0000001-0000-0000-0000-000000000010', 'PRC-RN-2009-010', '11111111-1111-1111-1111-111111111111', true)
ON CONFLICT (id) DO UPDATE SET
    license_number = EXCLUDED.license_number,
    is_active = EXCLUDED.is_active;

-- =====================================================
-- STEP 5: 10 EMPLOYEES (non-medical staff)
-- =====================================================

INSERT INTO profiles (id, email, first_name, last_name, middle_name, date_of_birth, sex, contact_number, user_type, role, department_id, campus_id) VALUES
    ('e0000001-0000-0000-0000-000000000001', 'emp.ramirez@liceo.edu.ph', 'Jose', 'Ramirez', 'Antonio', '1980-05-10', 'male', '09191234501', 'employee', 'employee', '22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111'),
    ('e0000001-0000-0000-0000-000000000002', 'emp.castro@liceo.edu.ph', 'Maria', 'Castro', 'Elena', '1985-08-22', 'female', '09191234502', 'employee', 'employee', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
    ('e0000001-0000-0000-0000-000000000003', 'emp.rivera@liceo.edu.ph', 'Pedro', 'Rivera', 'Miguel', '1978-12-03', 'male', '09191234503', 'employee', 'employee', '22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111'),
    ('e0000001-0000-0000-0000-000000000004', 'emp.flores@liceo.edu.ph', 'Carmen', 'Flores', 'Isabel', '1982-03-17', 'female', '09191234504', 'employee', 'employee', '22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111'),
    ('e0000001-0000-0000-0000-000000000005', 'emp.morales@liceo.edu.ph', 'Ricardo', 'Morales', 'Jose', '1975-07-28', 'male', '09191234505', 'employee', 'employee', '22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111'),
    ('e0000001-0000-0000-0000-000000000006', 'emp.jimenez@liceo.edu.ph', 'Teresa', 'Jimenez', 'Luz', '1988-11-14', 'female', '09191234506', 'employee', 'employee', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
    ('e0000001-0000-0000-0000-000000000007', 'emp.hernandez@liceo.edu.ph', 'Manuel', 'Hernandez', 'Carlos', '1983-02-06', 'male', '09191234507', 'employee', 'employee', '22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111'),
    ('e0000001-0000-0000-0000-000000000008', 'emp.diaz@liceo.edu.ph', 'Lucia', 'Diaz', 'Maria', '1990-06-19', 'female', '09191234508', 'employee', 'employee', '22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111'),
    ('e0000001-0000-0000-0000-000000000009', 'emp.vargas@liceo.edu.ph', 'Fernando', 'Vargas', 'Luis', '1979-10-01', 'male', '09191234509', 'employee', 'employee', '22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111'),
    ('e0000001-0000-0000-0000-000000000010', 'emp.romero@liceo.edu.ph', 'Angela', 'Romero', 'Rose', '1986-04-25', 'female', '09191234510', 'employee', 'employee', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- =====================================================
-- STEP 6: 10 STUDENTS
-- =====================================================

-- First create a college
INSERT INTO colleges (id, name, abbreviation, campus_id) VALUES
    ('33333333-3333-3333-3333-333333333331', 'College of Computer Studies', 'CCS', '11111111-1111-1111-1111-111111111111'),
    ('33333333-3333-3333-3333-333333333332', 'College of Engineering', 'COE', '11111111-1111-1111-1111-111111111111'),
    ('33333333-3333-3333-3333-333333333333', 'College of Business Administration', 'CBA', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, first_name, last_name, middle_name, date_of_birth, sex, contact_number, user_type, role, college_id, course, year_level, campus_id) VALUES
    ('s0000001-0000-0000-0000-000000000001', 'student.aguilar@liceo.edu.ph', 'John', 'Aguilar', 'Mark', '2002-01-15', 'male', '09201234501', 'student', 'student', '33333333-3333-3333-3333-333333333331', 'BS Information Technology', 3, '11111111-1111-1111-1111-111111111111'),
    ('s0000001-0000-0000-0000-000000000002', 'student.bautista@liceo.edu.ph', 'Jane', 'Bautista', 'Marie', '2003-04-20', 'female', '09201234502', 'student', 'student', '33333333-3333-3333-3333-333333333331', 'BS Computer Science', 2, '11111111-1111-1111-1111-111111111111'),
    ('s0000001-0000-0000-0000-000000000003', 'student.corpuz@liceo.edu.ph', 'Michael', 'Corpuz', 'James', '2001-07-08', 'male', '09201234503', 'student', 'student', '33333333-3333-3333-3333-333333333332', 'BS Civil Engineering', 4, '11111111-1111-1111-1111-111111111111'),
    ('s0000001-0000-0000-0000-000000000004', 'student.delos.santos@liceo.edu.ph', 'Sarah', 'Delos Santos', 'Ann', '2002-10-12', 'female', '09201234504', 'student', 'student', '33333333-3333-3333-3333-333333333333', 'BS Accountancy', 3, '11111111-1111-1111-1111-111111111111'),
    ('s0000001-0000-0000-0000-000000000005', 'student.enriquez@liceo.edu.ph', 'David', 'Enriquez', 'Paul', '2003-02-28', 'male', '09201234505', 'student', 'student', '33333333-3333-3333-3333-333333333331', 'BS Information Technology', 2, '11111111-1111-1111-1111-111111111111'),
    ('s0000001-0000-0000-0000-000000000006', 'student.francisco@liceo.edu.ph', 'Emily', 'Francisco', 'Grace', '2001-05-16', 'female', '09201234506', 'student', 'student', '33333333-3333-3333-3333-333333333332', 'BS Electrical Engineering', 4, '11111111-1111-1111-1111-111111111111'),
    ('s0000001-0000-0000-0000-000000000007', 'student.gutierrez@liceo.edu.ph', 'Kevin', 'Gutierrez', 'Joseph', '2002-08-03', 'male', '09201234507', 'student', 'student', '33333333-3333-3333-3333-333333333333', 'BS Business Administration', 3, '11111111-1111-1111-1111-111111111111'),
    ('s0000001-0000-0000-0000-000000000008', 'student.hidalgo@liceo.edu.ph', 'Nicole', 'Hidalgo', 'Faith', '2003-11-22', 'female', '09201234508', 'student', 'student', '33333333-3333-3333-3333-333333333331', 'BS Computer Science', 1, '11111111-1111-1111-1111-111111111111'),
    ('s0000001-0000-0000-0000-000000000009', 'student.ignacio@liceo.edu.ph', 'Patrick', 'Ignacio', 'Ryan', '2001-03-09', 'male', '09201234509', 'student', 'student', '33333333-3333-3333-3333-333333333332', 'BS Mechanical Engineering', 4, '11111111-1111-1111-1111-111111111111'),
    ('s0000001-0000-0000-0000-000000000010', 'student.jacinto@liceo.edu.ph', 'Amanda', 'Jacinto', 'Joy', '2002-06-30', 'female', '09201234510', 'student', 'student', '33333333-3333-3333-3333-333333333333', 'BS Marketing', 3, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- =====================================================
-- STEP 7: Update Weekly Schedule Limits (20 per day default)
-- =====================================================

-- Update existing limits or insert new ones
UPDATE weekly_schedule_limits 
SET max_appointments_per_week = 20 
WHERE appointment_type IN ('physical_exam', 'consultation');

-- If no rows updated, insert them
INSERT INTO weekly_schedule_limits (max_appointments_per_week, appointment_type)
SELECT 20, 'physical_exam'
WHERE NOT EXISTS (SELECT 1 FROM weekly_schedule_limits WHERE appointment_type = 'physical_exam');

INSERT INTO weekly_schedule_limits (max_appointments_per_week, appointment_type)
SELECT 20, 'consultation'
WHERE NOT EXISTS (SELECT 1 FROM weekly_schedule_limits WHERE appointment_type = 'consultation');

-- =====================================================
-- STEP 8: Sample Schedule Settings (if needed)
-- =====================================================

-- Enable scheduling for weekdays (Mon-Fri) for the main campus
INSERT INTO schedule_settings (campus_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments_per_slot, appointment_type, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 1, '08:00:00', '17:00:00', 30, 20, 'consultation', true),
    ('11111111-1111-1111-1111-111111111111', 2, '08:00:00', '17:00:00', 30, 20, 'consultation', true),
    ('11111111-1111-1111-1111-111111111111', 3, '08:00:00', '17:00:00', 30, 20, 'consultation', true),
    ('11111111-1111-1111-1111-111111111111', 4, '08:00:00', '17:00:00', 30, 20, 'consultation', true),
    ('11111111-1111-1111-1111-111111111111', 5, '08:00:00', '17:00:00', 30, 20, 'consultation', true),
    ('11111111-1111-1111-1111-111111111111', 1, '08:00:00', '17:00:00', 30, 20, 'physical_exam', true),
    ('11111111-1111-1111-1111-111111111111', 2, '08:00:00', '17:00:00', 30, 20, 'physical_exam', true),
    ('11111111-1111-1111-1111-111111111111', 3, '08:00:00', '17:00:00', 30, 20, 'physical_exam', true),
    ('11111111-1111-1111-1111-111111111111', 4, '08:00:00', '17:00:00', 30, 20, 'physical_exam', true),
    ('11111111-1111-1111-1111-111111111111', 5, '08:00:00', '17:00:00', 30, 20, 'physical_exam', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check all doctors
-- SELECT p.first_name, p.last_name, d.specialization, d.license_number 
-- FROM profiles p 
-- JOIN doctors d ON p.id = d.profile_id;

-- Check all nurses
-- SELECT p.first_name, p.last_name, n.license_number 
-- FROM profiles p 
-- JOIN nurses n ON p.id = n.profile_id;

-- Check all employees
-- SELECT first_name, last_name, email, role FROM profiles WHERE user_type = 'employee';

-- Check all students
-- SELECT first_name, last_name, email, course, year_level FROM profiles WHERE user_type = 'student';

-- Check weekly limits
-- SELECT * FROM weekly_schedule_limits;
