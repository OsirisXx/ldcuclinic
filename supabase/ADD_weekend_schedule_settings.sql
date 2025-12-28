-- =====================================================
-- ADD SCHEDULE SETTINGS FOR WEEKENDS (Saturday & Sunday)
-- This enables booking on Saturday and Sunday
-- =====================================================

-- Insert schedule settings for ALL campuses for Saturday (6) and Sunday (0)
-- For both consultation and physical_exam appointment types

INSERT INTO schedule_settings (campus_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments_per_slot, appointment_type, is_active)
SELECT 
    c.id as campus_id,
    d.day as day_of_week,
    '08:00:00'::TIME as start_time,
    '17:00:00'::TIME as end_time,
    30 as slot_duration_minutes,
    20 as max_appointments_per_slot,
    t.type::appointment_type as appointment_type,
    true as is_active
FROM campuses c
CROSS JOIN (SELECT unnest(ARRAY[0, 6]) as day) d  -- Sunday (0) and Saturday (6)
CROSS JOIN (SELECT unnest(ARRAY['consultation', 'physical_exam']) as type) t
ON CONFLICT DO NOTHING;

-- Verify the settings now include weekends
SELECT 'Schedule Settings including Weekends:' as info;
SELECT 
    c.name as campus_name,
    CASE s.day_of_week 
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name,
    s.day_of_week,
    s.appointment_type,
    s.is_active
FROM schedule_settings s
JOIN campuses c ON s.campus_id = c.id
ORDER BY c.name, s.day_of_week, s.appointment_type;
