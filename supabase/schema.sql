-- Liceo de Cagayan University Clinic Scheduling System
-- Normalized Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'nurse', 'student', 'employee');
CREATE TYPE appointment_type AS ENUM ('physical_exam', 'consultation');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE user_type AS ENUM ('student', 'employee');
CREATE TYPE sex_type AS ENUM ('male', 'female');

-- CAMPUSES TABLE (Normalized - supports multiple campuses)
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

-- COLLEGES TABLE (For students)
CREATE TABLE colleges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(20) NOT NULL,
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
    contact_number VARCHAR(20) NOT NULL,
    user_type user_type NOT NULL,
    role user_role DEFAULT 'student',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    college_id UUID REFERENCES colleges(id) ON DELETE SET NULL,
    course VARCHAR(255),
    year_level INTEGER CHECK (year_level >= 1 AND year_level <= 6),
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_student CHECK (
        (user_type = 'student' AND college_id IS NOT NULL) OR user_type = 'employee'
    ),
    CONSTRAINT valid_employee CHECK (
        (user_type = 'employee' AND department_id IS NOT NULL) OR user_type = 'student'
    )
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
    slot_duration_minutes INTEGER DEFAULT 120, -- 2 hours as per requirements
    max_appointments_per_slot INTEGER DEFAULT 20,
    appointment_type appointment_type NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campus_id, day_of_week, appointment_type),
    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- WEEKLY SCHEDULE LIMITS TABLE (Limit appointments per user type per week)
CREATE TABLE weekly_schedule_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_type user_type NOT NULL,
    max_appointments_per_week INTEGER NOT NULL DEFAULT 1,
    appointment_type appointment_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_type, appointment_type)
);

-- APPOINTMENTS TABLE (Main scheduling table)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    nurse_id UUID REFERENCES nurses(id) ON DELETE SET NULL,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    appointment_type appointment_type NOT NULL,
    status appointment_status DEFAULT 'scheduled',
    chief_complaint TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_appointment_time CHECK (start_time < end_time)
);

-- APPOINTMENT HISTORY TABLE (Audit trail for evidence)
CREATE TABLE appointment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'rescheduled', 'cancelled', 'completed', 'contacted'
    previous_date DATE,
    previous_time TIME,
    new_date DATE,
    new_time TIME,
    changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    contacted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_campus ON appointments(campus_id);
CREATE INDEX idx_appointment_history_appointment ON appointment_history(appointment_id);
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_profiles_role ON profiles(role);

-- FUNCTIONS

-- Function to calculate age from date of birth
CREATE OR REPLACE FUNCTION calculate_age(dob DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob));
END;
$$ LANGUAGE plpgsql;

-- Function to check weekly appointment limit
CREATE OR REPLACE FUNCTION check_weekly_limit(
    p_patient_id UUID,
    p_appointment_date DATE,
    p_appointment_type appointment_type
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_type user_type;
    v_max_limit INTEGER;
    v_current_count INTEGER;
    v_week_start DATE;
    v_week_end DATE;
BEGIN
    -- Get user type
    SELECT user_type INTO v_user_type FROM profiles WHERE id = p_patient_id;
    
    -- Get max limit for this user type and appointment type
    SELECT max_appointments_per_week INTO v_max_limit 
    FROM weekly_schedule_limits 
    WHERE user_type = v_user_type AND appointment_type = p_appointment_type;
    
    -- If no limit set, default to 1
    IF v_max_limit IS NULL THEN
        v_max_limit := 1;
    END IF;
    
    -- Calculate week boundaries (Monday to Friday)
    v_week_start := DATE_TRUNC('week', p_appointment_date)::DATE;
    v_week_end := v_week_start + INTERVAL '4 days';
    
    -- Count existing appointments this week
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

-- Auto-update updated_at for profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for appointments
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for schedule_settings
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

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
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

CREATE POLICY "Admins can update all profiles"
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

-- Campuses policies (public read)
CREATE POLICY "Anyone can view campuses"
    ON campuses FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage campuses"
    ON campuses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Departments policies (public read)
CREATE POLICY "Anyone can view departments"
    ON departments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage departments"
    ON departments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Colleges policies (public read)
CREATE POLICY "Anyone can view colleges"
    ON colleges FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage colleges"
    ON colleges FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Doctors policies
CREATE POLICY "Anyone can view active doctors"
    ON doctors FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Admins can manage doctors"
    ON doctors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Nurses policies
CREATE POLICY "Anyone can view active nurses"
    ON nurses FOR SELECT
    TO authenticated
    USING (is_active = true);

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
    USING (patient_id = auth.uid());

CREATE POLICY "Users can create their own appointments"
    ON appointments FOR INSERT
    WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Users can update their own appointments"
    ON appointments FOR UPDATE
    USING (patient_id = auth.uid());

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
CREATE POLICY "Users can view their appointment history"
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

-- Insert default campus
INSERT INTO campuses (name, address) VALUES 
    ('Main Campus', 'Rodolfo N. Pelaez Boulevard, Kauswagan, Cagayan de Oro City'),
    ('Puntod Campus', 'Puntod, Cagayan de Oro City');

-- Insert default weekly limits
INSERT INTO weekly_schedule_limits (user_type, max_appointments_per_week, appointment_type) VALUES
    ('student', 1, 'physical_exam'),
    ('student', 2, 'consultation'),
    ('employee', 1, 'physical_exam'),
    ('employee', 2, 'consultation');

-- Insert sample schedule settings (Monday-Friday, 8AM-5PM)
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
CROSS JOIN (SELECT unnest(ARRAY['physical_exam', 'consultation']::appointment_type[]) as type) t
WHERE c.name = 'Main Campus';
