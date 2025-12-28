# Liceo de Cagayan University - Clinic Scheduling System

A modern web application for scheduling clinic appointments at Liceo de Cagayan University. Built with Remix, Supabase, and Tailwind CSS.

## Features

- **User Authentication**: Secure login/registration for students and employees
- **Appointment Scheduling**: Book physical exams and consultations
- **Calendar View**: Visual weekly calendar with available time slots
- **Weekly Limits**: Configurable limits on appointments per user type
- **Admin Dashboard**: Full access for medical staff to manage appointments
- **Appointment History**: Complete audit trail for evidence and tracking
- **Multi-Campus Support**: Support for multiple university campuses
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Remix (React)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Language**: TypeScript

## Theme Colors

- **Maroon**: #800020 (Primary)
- **Gold**: #d4af37 (Secondary)
- **White**: #ffffff (Background)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env`:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. Set up the database:
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Run the SQL script in `supabase/schema.sql`

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open http://localhost:5173 in your browser

## Database Schema

The database is normalized and includes the following tables:

- **profiles**: User information linked to Supabase Auth
- **campuses**: University campuses
- **departments**: Employee departments
- **colleges**: Student colleges
- **doctors**: Medical doctors
- **nurses**: Medical nurses
- **schedule_settings**: Configurable time slots per campus
- **appointments**: Main scheduling table
- **appointment_history**: Audit trail for changes
- **weekly_schedule_limits**: Limits per user type

## User Roles

- **Student**: Can schedule appointments within weekly limits
- **Employee**: Can schedule appointments within weekly limits
- **Nurse**: Can view and manage all appointments
- **Doctor**: Can view and manage all appointments
- **Admin**: Full access to all features and settings

## Key Features by Role

### Students/Employees
- Schedule physical exams and consultations
- View and manage their appointments
- Reschedule or cancel appointments
- View appointment history

### Medical Staff (Doctors/Nurses)
- View all appointments
- Mark appointments as completed/no-show
- Contact patients
- Reschedule appointments

### Admin
- All medical staff features
- Manage schedule settings
- Delete appointments
- Configure weekly limits

## API Routes

- `/` - Landing page
- `/login` - User login
- `/register` - User registration
- `/dashboard` - User dashboard
- `/schedule` - Schedule new appointment
- `/appointments` - View all appointments
- `/profile` - User profile
- `/admin` - Admin dashboard (staff only)

## License

© 2024 Liceo de Cagayan University. All rights reserved.
