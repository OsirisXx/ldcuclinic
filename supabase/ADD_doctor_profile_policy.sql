-- =====================================================
-- ADD RLS POLICY TO ALLOW READING DOCTOR/NURSE PROFILES
-- Current policies only allow users to view their OWN profile
-- This adds a policy to allow viewing doctor/nurse profiles
-- =====================================================

-- Allow anyone to view profiles of doctors and nurses (for appointment booking)
CREATE POLICY "Anyone can view doctor and nurse profiles"
ON profiles
FOR SELECT
USING (role IN ('doctor', 'nurse'));

-- Verify
SELECT 'Updated policies:' as info;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';
