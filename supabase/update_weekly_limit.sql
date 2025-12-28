-- Run this SQL to update the weekly limit to 20
-- Execute this in Supabase SQL Editor

UPDATE weekly_schedule_limits 
SET max_appointments_per_week = 20 
WHERE appointment_type = 'consultation';

UPDATE weekly_schedule_limits 
SET max_appointments_per_week = 20 
WHERE appointment_type = 'physical_exam';

-- Verify the update
SELECT * FROM weekly_schedule_limits;
