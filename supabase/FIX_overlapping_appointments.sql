-- =====================================================
-- FIX OVERLAPPING APPOINTMENTS
-- This script redistributes appointments so each time slot has only 1 appointment
-- =====================================================

-- First, let's see which slots have multiple appointments
SELECT 
    appointment_date,
    start_time,
    campus_id,
    COUNT(*) as appointment_count
FROM appointments
WHERE status = 'scheduled'
GROUP BY appointment_date, start_time, campus_id
HAVING COUNT(*) > 1
ORDER BY appointment_date, start_time;

-- Fix overlapping appointments by redistributing them
-- This will reassign start_time and end_time to sequential slots
DO $$
DECLARE
    v_campus_id UUID;
    v_date DATE;
    v_slot_duration INT := 24; -- 24 minutes per slot (480 min / 20 patients)
    v_current_minutes INT;
    v_start_time TIME;
    v_end_time TIME;
    v_appt RECORD;
    v_dates DATE[];
BEGIN
    -- Get the first campus
    SELECT id INTO v_campus_id FROM campuses LIMIT 1;
    
    -- Get all unique dates with scheduled appointments
    SELECT ARRAY_AGG(DISTINCT appointment_date ORDER BY appointment_date) 
    INTO v_dates
    FROM appointments 
    WHERE status = 'scheduled' AND campus_id = v_campus_id;
    
    -- Process each date
    FOREACH v_date IN ARRAY v_dates LOOP
        v_current_minutes := 8 * 60; -- Start at 8:00 AM
        
        -- Loop through all appointments for this date, ordered by original start_time
        FOR v_appt IN 
            SELECT id, start_time 
            FROM appointments 
            WHERE appointment_date = v_date 
              AND campus_id = v_campus_id 
              AND status = 'scheduled'
            ORDER BY start_time, id
        LOOP
            -- Skip lunch break (12:00 - 13:00)
            IF v_current_minutes >= 12 * 60 AND v_current_minutes < 13 * 60 THEN
                v_current_minutes := 13 * 60;
            END IF;
            
            -- Calculate new times
            v_start_time := (FLOOR(v_current_minutes / 60)::TEXT || ':' || 
                           LPAD((v_current_minutes % 60)::TEXT, 2, '0') || ':00')::TIME;
            v_end_time := (FLOOR((v_current_minutes + v_slot_duration) / 60)::TEXT || ':' || 
                         LPAD(((v_current_minutes + v_slot_duration) % 60)::TEXT, 2, '0') || ':00')::TIME;
            
            -- Update the appointment
            UPDATE appointments 
            SET start_time = v_start_time, end_time = v_end_time
            WHERE id = v_appt.id;
            
            v_current_minutes := v_current_minutes + v_slot_duration;
        END LOOP;
        
        RAISE NOTICE 'Fixed appointments for date: %', v_date;
    END LOOP;
END $$;

-- Verify no more overlapping appointments
SELECT 
    appointment_date,
    start_time,
    campus_id,
    COUNT(*) as appointment_count
FROM appointments
WHERE status = 'scheduled'
GROUP BY appointment_date, start_time, campus_id
HAVING COUNT(*) > 1
ORDER BY appointment_date, start_time;
