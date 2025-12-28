-- =====================================================
-- ADD PATIENT FIELDS TO APPOINTMENTS TABLE
-- Patients are outsiders without accounts, so we store their info directly
-- =====================================================

-- Add patient info columns to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS patient_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS patient_contact VARCHAR(50);

-- Make patient_id nullable (since patients don't have accounts)
ALTER TABLE appointments 
ALTER COLUMN patient_id DROP NOT NULL;

-- Update the foreign key to allow null
-- First drop the existing constraint if it exists
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;

-- Re-add it without the NOT NULL requirement
ALTER TABLE appointments
ADD CONSTRAINT appointments_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Verify
SELECT 'Appointments table columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments'
ORDER BY ordinal_position;
