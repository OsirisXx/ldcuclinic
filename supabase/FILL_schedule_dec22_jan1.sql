-- =====================================================
-- FILL SCHEDULE FROM DEC 22, 2025 TO JAN 1, 2026
-- 20 appointments per day, mixed consultation and physical_exam
-- =====================================================

-- First, get the campus ID (using the first campus)
DO $$
DECLARE
    v_campus_id UUID;
    v_current_date DATE := '2025-12-22';
    v_end_date DATE := '2026-01-01';
    v_slot_duration INT := 24; -- 480 minutes / 20 patients = 24 minutes per slot
    v_current_minutes INT;
    v_start_time TIME;
    v_end_time TIME;
    v_appt_type TEXT;
    v_patient_num INT := 1;
BEGIN
    -- Get the first campus
    SELECT id INTO v_campus_id FROM campuses LIMIT 1;
    
    IF v_campus_id IS NULL THEN
        RAISE EXCEPTION 'No campus found. Please create a campus first.';
    END IF;
    
    -- Loop through each date
    WHILE v_current_date <= v_end_date LOOP
        -- Skip weekends (0 = Sunday, 6 = Saturday)
        IF EXTRACT(DOW FROM v_current_date) NOT IN (0, 6) THEN
            
            -- Reset to morning start
            v_current_minutes := 8 * 60; -- 8:00 AM
            
            -- Create 20 appointments per day
            FOR i IN 1..20 LOOP
                -- Skip lunch break (12:00 - 13:00)
                IF v_current_minutes >= 12 * 60 AND v_current_minutes < 13 * 60 THEN
                    v_current_minutes := 13 * 60;
                END IF;
                
                -- Calculate start and end times
                v_start_time := (v_current_minutes / 60)::TEXT || ':' || 
                               LPAD((v_current_minutes % 60)::TEXT, 2, '0') || ':00';
                v_end_time := ((v_current_minutes + v_slot_duration) / 60)::TEXT || ':' || 
                             LPAD(((v_current_minutes + v_slot_duration) % 60)::TEXT, 2, '0') || ':00';
                
                -- Alternate between consultation and physical_exam
                IF i % 2 = 0 THEN
                    v_appt_type := 'physical_exam';
                ELSE
                    v_appt_type := 'consultation';
                END IF;
                
                -- Insert the appointment
                INSERT INTO appointments (
                    appointment_date,
                    start_time,
                    end_time,
                    appointment_type,
                    campus_id,
                    patient_name,
                    patient_email,
                    patient_contact,
                    status,
                    chief_complaint
                ) VALUES (
                    v_current_date,
                    v_start_time::TIME,
                    v_end_time::TIME,
                    v_appt_type::appointment_type,
                    v_campus_id,
                    'Patient ' || v_patient_num,
                    'patient' || v_patient_num || '@example.com',
                    '0917' || LPAD(v_patient_num::TEXT, 7, '0'),
                    'scheduled',
                    CASE 
                        WHEN v_appt_type = 'consultation' THEN 'General checkup'
                        ELSE 'Annual physical examination'
                    END
                );
                
                v_patient_num := v_patient_num + 1;
                v_current_minutes := v_current_minutes + v_slot_duration;
            END LOOP;
            
        END IF;
        
        v_current_date := v_current_date + 1;
    END LOOP;
    
    RAISE NOTICE 'Created % appointments from Dec 22, 2025 to Jan 1, 2026', v_patient_num - 1;
END $$;

-- Verify the appointments
SELECT 
    appointment_date,
    COUNT(*) as total_appointments,
    COUNT(*) FILTER (WHERE appointment_type = 'consultation') as consultations,
    COUNT(*) FILTER (WHERE appointment_type = 'physical_exam') as physical_exams
FROM appointments
WHERE appointment_date >= '2025-12-22' AND appointment_date <= '2026-01-01'
GROUP BY appointment_date
ORDER BY appointment_date;
