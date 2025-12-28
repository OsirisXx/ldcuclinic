export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "doctor" | "nurse" | "student" | "employee";
export type AppointmentType = "physical_exam" | "consultation";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type UserType = "student" | "employee";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          middle_name: string | null;
          date_of_birth: string | null;
          sex: "male" | "female" | null;
          contact_number: string;
          user_type: UserType;
          role: UserRole;
          department_id: string | null;
          college_id: string | null;
          course: string | null;
          year_level: number | null;
          campus_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          middle_name?: string | null;
          date_of_birth?: string | null;
          sex?: "male" | "female" | null;
          contact_number: string;
          user_type: UserType;
          role?: UserRole;
          department_id?: string | null;
          college_id?: string | null;
          course?: string | null;
          year_level?: number | null;
          campus_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          middle_name?: string | null;
          date_of_birth?: string | null;
          sex?: "male" | "female" | null;
          contact_number?: string;
          user_type?: UserType;
          role?: UserRole;
          department_id?: string | null;
          college_id?: string | null;
          course?: string | null;
          year_level?: number | null;
          campus_id?: string | null;
          updated_at?: string;
        };
      };
      campuses: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          address?: string | null;
        };
      };
      departments: {
        Row: {
          id: string;
          name: string;
          campus_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          campus_id: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          campus_id?: string;
        };
      };
      colleges: {
        Row: {
          id: string;
          name: string;
          abbreviation: string;
          campus_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          abbreviation: string;
          campus_id: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          abbreviation?: string;
          campus_id?: string;
        };
      };
      doctors: {
        Row: {
          id: string;
          profile_id: string;
          specialization: string | null;
          license_number: string;
          campus_id: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          specialization?: string | null;
          license_number: string;
          campus_id: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          specialization?: string | null;
          license_number?: string;
          campus_id?: string;
          is_active?: boolean;
        };
      };
      nurses: {
        Row: {
          id: string;
          profile_id: string;
          license_number: string;
          campus_id: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          license_number: string;
          campus_id: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          license_number?: string;
          campus_id?: string;
          is_active?: boolean;
        };
      };
      schedule_settings: {
        Row: {
          id: string;
          campus_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_duration_minutes: number;
          max_appointments_per_slot: number;
          appointment_type: AppointmentType;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campus_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_duration_minutes?: number;
          max_appointments_per_slot?: number;
          appointment_type: AppointmentType;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          slot_duration_minutes?: number;
          max_appointments_per_slot?: number;
          appointment_type?: AppointmentType;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string | null;
          nurse_id: string | null;
          campus_id: string;
          appointment_date: string;
          start_time: string;
          end_time: string;
          appointment_type: AppointmentType;
          status: AppointmentStatus;
          chief_complaint: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id?: string | null;
          nurse_id?: string | null;
          campus_id: string;
          appointment_date: string;
          start_time: string;
          end_time: string;
          appointment_type: AppointmentType;
          status?: AppointmentStatus;
          chief_complaint?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          doctor_id?: string | null;
          nurse_id?: string | null;
          appointment_date?: string;
          start_time?: string;
          end_time?: string;
          appointment_type?: AppointmentType;
          status?: AppointmentStatus;
          chief_complaint?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      appointment_history: {
        Row: {
          id: string;
          appointment_id: string;
          action: string;
          previous_date: string | null;
          previous_time: string | null;
          new_date: string | null;
          new_time: string | null;
          changed_by: string;
          reason: string | null;
          contacted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          action: string;
          previous_date?: string | null;
          previous_time?: string | null;
          new_date?: string | null;
          new_time?: string | null;
          changed_by: string;
          reason?: string | null;
          contacted?: boolean;
          created_at?: string;
        };
        Update: {
          action?: string;
          previous_date?: string | null;
          previous_time?: string | null;
          new_date?: string | null;
          new_time?: string | null;
          reason?: string | null;
          contacted?: boolean;
        };
      };
      weekly_schedule_limits: {
        Row: {
          id: string;
          user_type: UserType;
          max_appointments_per_week: number;
          appointment_type: AppointmentType;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_type: UserType;
          max_appointments_per_week: number;
          appointment_type: AppointmentType;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_type?: UserType;
          max_appointments_per_week?: number;
          appointment_type?: AppointmentType;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      appointment_type: AppointmentType;
      appointment_status: AppointmentStatus;
      user_type: UserType;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
