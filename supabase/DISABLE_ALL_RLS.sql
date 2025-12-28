-- =====================================================
-- DISABLE RLS ON ALL TABLES
-- This removes all row-level security restrictions
-- WARNING: Only use in development, not production!
-- =====================================================

-- Disable RLS on all clinic tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE doctors DISABLE ROW LEVEL SECURITY;
ALTER TABLE nurses DISABLE ROW LEVEL SECURITY;
ALTER TABLE campuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedule_limits DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 'RLS Status:' as info;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
