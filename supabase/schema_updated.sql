-- Liceo de Cagayan University Clinic Scheduling System
-- Updated Database Schema for Supabase
-- Changes: Employees only (no students), Google Auth support, is_verified field, updated campuses

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS (Updated - removed student from user_type, kept in role for backwards compatibility)
CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'nurse', 'employee');
CREATE TYPE appointment_type AS ENUM ('physical_exam', 'consultation');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE sex_type AS ENUM ('male', 'female');

-- CAMPUSES TABLE
CREATE TABLE campuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEPARTMENTS TABLE (For employees)
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, campus_id)
);

-- PROFILES TABLE (Main user table linked to Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE,
    sex sex_type,
    contact_number VARCHAR(20),
    role user_role DEFAULT 'employee',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    auth_provider VARCHAR(50) DEFAULT 'email',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOCTORS TABLE (Medical staff)
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    specialization VARCHAR(255),
    license_number VARCHAR(100) NOT NULL UNIQUE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NURSES TABLE (Medical staff)
CREATE TABLE nurses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCHEDULE SETTINGS TABLE (Configurable time slots per campus)
CREATE TABLE schedule_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER DEFAULT 120,
    max_appointments_per_slot INTEGER DEFAULT 20,
    appointment_type appointment_type NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campus_id, day_of_week, start_time, appointment_type)
);

-- APPOINTMENTS TABLE
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    appointment_type appointment_type NOT NULL,
    chief_complaint TEXT,
    status appointment_status DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- APPOINTMENT HISTORY TABLE (Audit trail)
CREATE TABLE appointment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    previous_date DATE,
    previous_time TIME,
    new_date DATE,
    new_time TIME,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    contacted BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WEEKLY SCHEDULE LIMITS TABLE (Employees only now)
CREATE TABLE weekly_schedule_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    max_appointments_per_week INTEGER NOT NULL DEFAULT 1,
    appointment_type appointment_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_type)
);

-- INDEXES
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_verified ON profiles(is_verified);
CREATE INDEX idx_profiles_role ON profiles(role);

-- FUNCTIONS

-- Function to calculate age
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date));
END;
$$ LANGUAGE plpgsql;

-- Function to check weekly appointment limit
CREATE OR REPLACE FUNCTION check_weekly_limit(
    p_patient_id UUID,
    p_appointment_type appointment_type,
    p_appointment_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_limit INTEGER;
    v_current_count INTEGER;
    v_week_start DATE;
    v_week_end DATE;
BEGIN
    v_week_start := date_trunc('week', p_appointment_date)::DATE;
    v_week_end := v_week_start + INTERVAL '6 days';
    
    SELECT max_appointments_per_week INTO v_max_limit
    FROM weekly_schedule_limits
    WHERE appointment_type = p_appointment_type;
    
    IF v_max_limit IS NULL THEN
        v_max_limit := 1;
    END IF;
    
    SELECT COUNT(*) INTO v_current_count
    FROM appointments
    WHERE patient_id = p_patient_id
        AND appointment_type = p_appointment_type
        AND appointment_date BETWEEN v_week_start AND v_week_end
        AND status NOT IN ('cancelled');
    
    RETURN v_current_count < v_max_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_settings_updated_at
    BEFORE UPDATE ON schedule_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to log appointment changes
CREATE OR REPLACE FUNCTION log_appointment_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO appointment_history (appointment_id, action, new_date, new_time, changed_by)
        VALUES (NEW.id, 'created', NEW.appointment_date, NEW.start_time, NEW.patient_id);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.appointment_date != NEW.appointment_date OR OLD.start_time != NEW.start_time THEN
            INSERT INTO appointment_history (
                appointment_id, action, previous_date, previous_time, 
                new_date, new_time, changed_by
            )
            VALUES (
                NEW.id, 'rescheduled', OLD.appointment_date, OLD.start_time,
                NEW.appointment_date, NEW.start_time, NEW.patient_id
            );
        ELSIF OLD.status != NEW.status THEN
            INSERT INTO appointment_history (appointment_id, action, changed_by)
            VALUES (NEW.id, NEW.status::TEXT, NEW.patient_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_audit_trigger
    AFTER INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION log_appointment_change();

-- ROW LEVEL SECURITY (RLS)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurses ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedule_limits ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all profiles"
    ON profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Medical staff can view patient profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('doctor', 'nurse')
        )
    );

-- Allow insert for new users (service role will handle this)
CREATE POLICY "Allow insert for authenticated users"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Campuses policies (public read for authenticated)
CREATE POLICY "Anyone can view campuses"
    ON campuses FOR SELECT
    TO authenticated
    USING (true);

-- Allow anon to view campuses for registration
CREATE POLICY "Anon can view campuses"
    ON campuses FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Admins can manage campuses"
    ON campuses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Departments policies
CREATE POLICY "Anyone can view departments"
    ON departments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Anon can view departments"
    ON departments FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Admins can manage departments"
    ON departments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Doctors policies
CREATE POLICY "Anyone can view doctors"
    ON doctors FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage doctors"
    ON doctors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Nurses policies
CREATE POLICY "Anyone can view nurses"
    ON nurses FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage nurses"
    ON nurses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Schedule settings policies
CREATE POLICY "Anyone can view schedule settings"
    ON schedule_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage schedule settings"
    ON schedule_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Appointments policies
CREATE POLICY "Users can view their own appointments"
    ON appointments FOR SELECT
    USING (auth.uid() = patient_id);

CREATE POLICY "Users can create their own appointments"
    ON appointments FOR INSERT
    WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Users can update their own appointments"
    ON appointments FOR UPDATE
    USING (auth.uid() = patient_id);

CREATE POLICY "Medical staff can view all appointments"
    ON appointments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'nurse')
        )
    );

CREATE POLICY "Medical staff can manage all appointments"
    ON appointments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'nurse')
        )
    );

-- Appointment history policies
CREATE POLICY "Users can view their own appointment history"
    ON appointment_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM appointments 
            WHERE appointments.id = appointment_history.appointment_id 
            AND appointments.patient_id = auth.uid()
        )
    );

CREATE POLICY "Medical staff can view all appointment history"
    ON appointment_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'nurse')
        )
    );

CREATE POLICY "Medical staff can create appointment history"
    ON appointment_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'nurse')
        )
    );

-- Weekly schedule limits policies
CREATE POLICY "Anyone can view weekly limits"
    ON weekly_schedule_limits FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage weekly limits"
    ON weekly_schedule_limits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- SEED DATA

-- Insert campuses (Main, Paseo, RNP)
INSERT INTO campuses (name, address) VALUES 
    ('Main Campus', 'Rodolfo N. Pelaez Boulevard, Kauswagan, Cagayan de Oro City'),
    ('Paseo Campus', 'Paseo del Rio, Cagayan de Oro City'),
    ('RNP Campus', 'RNP Boulevard, Cagayan de Oro City');

-- Insert default weekly limits (employees only)
INSERT INTO weekly_schedule_limits (max_appointments_per_week, appointment_type) VALUES
    (1, 'physical_exam'),
    (2, 'consultation');

-- Insert sample departments for each campus
INSERT INTO departments (name, campus_id)
SELECT dept.name, c.id
FROM campuses c
CROSS JOIN (
    SELECT unnest(ARRAY[
        'Human Resources',
        'Finance',
        'Information Technology',
        'Academic Affairs',
        'Student Affairs',
        'Registrar',
        'Library',
        'Maintenance',
        'Security',
        'Clinic'
    ]) as name
) dept;

-- Insert sample schedule settings (Monday-Friday, 8AM-5PM) for all campuses
INSERT INTO schedule_settings (campus_id, day_of_week, start_time, end_time, slot_duration_minutes, appointment_type)
SELECT 
    c.id,
    d.day,
    '08:00:00'::TIME,
    '17:00:00'::TIME,
    120,
    t.type
FROM campuses c
CROSS JOIN (SELECT generate_series(1, 5) as day) d
CROSS JOIN (SELECT unnest(ARRAY['physical_exam', 'consultation']::appointment_type[]) as type) t;

-- =====================================================
-- ADMIN ACCOUNT SETUP
-- Run this AFTER a user signs up with hbusa82663@liceo.edu.ph via Google Auth
-- This will make that user an admin and mark them as verified
-- =====================================================

-- To make hbusa82663@liceo.edu.ph an admin, run this after they sign up:
-- UPDATE profiles 
-- SET role = 'admin', is_verified = true 
-- WHERE email = 'hbusa82663@liceo.edu.ph';

-- Or insert directly if you know the user ID from auth.users:
-- INSERT INTO profiles (id, email, first_name, last_name, role, is_verified, auth_provider)
-- VALUES (
--     'USER_ID_FROM_AUTH_USERS',
--     'hbusa82663@liceo.edu.ph',
--     'Admin',
--     'User',
--     'admin',
--     true,
--     'google'
-- );
