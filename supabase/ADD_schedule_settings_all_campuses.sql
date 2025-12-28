-- =====================================================
-- ADD SCHEDULE SETTINGS FOR ALL CAMPUSES
-- This ensures all campuses have schedule settings for Mon-Fri
-- =====================================================

-- Insert schedule settings for ALL campuses (Monday-Friday, 8AM-5PM)
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
CROSS JOIN (SELECT generate_series(1, 5) as day) d  -- Monday (1) to Friday (5)
CROSS JOIN (SELECT unnest(ARRAY['consultation', 'physical_exam']) as type) t
ON CONFLICT DO NOTHING;

-- Verify the settings
SELECT 'Schedule Settings by Campus:' as info;
SELECT 
    c.name as campus_name,
    s.day_of_week,
    s.appointment_type,
    s.is_active
FROM schedule_settings s
JOIN campuses c ON s.campus_id = c.id
ORDER BY c.name, s.day_of_week, s.appointment_type;
