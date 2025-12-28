-- =====================================================
-- FIX APPOINTMENT_HISTORY TRIGGER
-- Make changed_by nullable since appointments can be created without a user context
-- =====================================================

-- Make changed_by nullable
ALTER TABLE appointment_history 
ALTER COLUMN changed_by DROP NOT NULL;

-- Verify
SELECT 'appointment_history columns:' as info;
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointment_history';
