import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useActionData, useNavigation, useFetcher } from "@remix-run/react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight, AlertCircle, User, Loader2, Settings, Trash2, Mail } from "lucide-react";
import { Layout } from "~/components/layout";
import { Button, Card, CardHeader, CardTitle, CardContent, Select, Input, Modal } from "~/components/ui";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { createSupabaseBrowserClient } from "~/lib/supabase.client";
import { formatDate, formatTime, getWeekBounds } from "~/lib/utils";

export const meta: MetaFunction = () => {
  return [{ title: "Book Appointment - Liceo Clinic" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return redirect("/login", { headers });
  }

  // Use admin client to bypass RLS for profile only (minimal server work)
  const { createSupabaseAdminClient } = await import("~/lib/supabase.server");
  const adminClient = createSupabaseAdminClient();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile) {
    return redirect("/login", { headers });
  }

  // Only return profile and user ID - data will be fetched client-side
  return json({
    profile,
    userId: session.user.id,
  }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const appointmentDate = formData.get("appointmentDate") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const appointmentType = formData.get("appointmentType") as "physical_exam" | "consultation";
  const campusId = formData.get("campusId") as string;
  const chiefComplaint = formData.get("chiefComplaint") as string;
  const doctorId = formData.get("doctorId") as string;
  const patientName = formData.get("patientName") as string;
  const patientEmail = formData.get("patientEmail") as string;
  const patientContact = formData.get("patientContact") as string;

  if (!appointmentDate || !startTime || !endTime || !appointmentType || !campusId || !patientName) {
    return json({ error: "All fields are required including patient name" }, { status: 400 });
  }

  const { error } = await supabase.from("appointments").insert({
    appointment_date: appointmentDate,
    start_time: startTime,
    end_time: endTime,
    appointment_type: appointmentType,
    campus_id: campusId,
    chief_complaint: chiefComplaint || null,
    doctor_id: doctorId || null,
    patient_name: patientName,
    patient_email: patientEmail || null,
    patient_contact: patientContact || null,
    status: "scheduled",
  });

  if (error) {
    return json({ error: error.message }, { status: 400 });
  }

  return json({ success: true, message: "Appointment booked successfully!" });
}

export default function Schedule() {
  const { profile, userId } = useLoaderData<typeof loader>();

  const actionData = useActionData<{ error?: string; success?: boolean; message?: string }>();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const isSubmitting = navigation.state === "submitting";

  // Client-side state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [appointmentType, setAppointmentType] = useState<"physical_exam" | "consultation">("consultation");
  const [selectedCampus, setSelectedCampus] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // Client-side data fetching state
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleSettings, setScheduleSettings] = useState<any[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [userAppointmentsThisWeek, setUserAppointmentsThisWeek] = useState<any[]>([]);
  const [weeklyLimits, setWeeklyLimits] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [patientName, setPatientName] = useState<string>("");
  const [patientEmail, setPatientEmail] = useState<string>("");
  const [patientContact, setPatientContact] = useState<string>("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [newDailyLimit, setNewDailyLimit] = useState<number>(20);
  const [confirmLimit, setConfirmLimit] = useState<string>("");
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleFromTime, setRescheduleFromTime] = useState<string>("08:00:00");
  const [isRescheduling, setIsRescheduling] = useState(false);
  
  // Calendar and reschedule settings
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [hiddenDays, setHiddenDays] = useState<number[]>([0, 6]); // Default: hide Sunday (0) and Saturday (6)
  const [halfDays, setHalfDays] = useState<number[]>([]); // Days with morning only
  const [holidays, setHolidays] = useState<string[]>([]); // Array of date strings "YYYY-MM-DD"
  const [newHolidayDate, setNewHolidayDate] = useState<string>("");
  
  // Email reminder state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState<"today" | "tomorrow" | "custom">("tomorrow");
  const [customEmailDate, setCustomEmailDate] = useState<string>("");
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: number; skipped: number; failed: number } | null>(null);

  // Handle successful booking
  useEffect(() => {
    if (actionData?.success) {
      setShowModal(false);
      setShowSuccessAlert(true);
      setSuccessMessage(actionData.message || "Appointment booked successfully!");
      setPatientName("");
      setPatientEmail("");
      setPatientContact("");
      fetchData();
      
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        setShowSuccessAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionData]);

  // Calculate week bounds
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const { start: weekStart, end: weekEnd } = getWeekBounds(baseDate);

  // Fetch data client-side
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      const [
        settingsRes,
        appointmentsRes,
        userApptsRes,
        limitsRes,
        doctorsRes,
        campusesRes,
      ] = await Promise.all([
        supabase.from("schedule_settings").select("*").eq("is_active", true),
        supabase.from("appointments").select(`*, patient:patient_id(first_name, last_name)`)
          .gte("appointment_date", weekStartStr)
          .lte("appointment_date", weekEndStr),
        supabase.from("appointments").select("*")
          .eq("patient_id", userId)
          .gte("appointment_date", weekStartStr)
          .lte("appointment_date", weekEndStr)
          .in("status", ["scheduled"]),
        supabase.from("weekly_schedule_limits").select("*"),
        supabase.from("doctors").select(`
          id,
          profile_id,
          specialization,
          license_number,
          campus_id,
          is_active,
          profiles:profile_id (
            first_name,
            last_name,
            email
          )
        `).eq("is_active", true),
        supabase.from("campuses").select("*"),
      ]);

      setScheduleSettings(settingsRes.data || []);
      setExistingAppointments(appointmentsRes.data || []);
      setUserAppointmentsThisWeek(userApptsRes.data || []);
      setWeeklyLimits(limitsRes.data || []);
      setDoctors(doctorsRes.data || []);
      setCampuses(campusesRes.data || []);
      
      // Set default campus to current user's campus, or first campus if not set
      if (!selectedCampus) {
        const userCampus = profile.campus_id;
        if (userCampus) {
          setSelectedCampus(userCampus);
        } else if (campusesRes.data && campusesRes.data.length > 0) {
          setSelectedCampus((campusesRes.data[0] as any).id);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [weekOffset, userId, selectedCampus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get daily limit for current appointment type
  const getDailyLimitForType = useCallback(() => {
    const limit = weeklyLimits.find(
      (l: any) => l.appointment_type === appointmentType
    );
    return limit?.max_appointments_per_week || 20;
  }, [weeklyLimits, appointmentType]);

  // Calculate slot duration based on daily limit
  // Morning: 8am-12pm (4 hours = 240 min), Afternoon: 1pm-5pm (4 hours = 240 min)
  // Total: 480 minutes per day
  const totalMinutesPerDay = 480; // 8 hours total (4 morning + 4 afternoon)
  const dailyLimit = getDailyLimitForType();
  const slotDurationMinutes = Math.max(10, Math.floor(totalMinutesPerDay / dailyLimit)); // Min 10 minutes per slot

  // Generate dynamic time slots based on daily limit
  const timeSlots = useMemo(() => {
    const slots: { start: string; end: string; label: string }[] = [];
    
    // Morning slots: 8:00 AM - 12:00 PM
    let currentMinutes = 8 * 60; // Start at 8:00 AM
    const morningEnd = 12 * 60; // End at 12:00 PM
    
    while (currentMinutes < morningEnd) {
      const startHour = Math.floor(currentMinutes / 60);
      const startMin = currentMinutes % 60;
      const endMinutes = Math.min(currentMinutes + slotDurationMinutes, morningEnd);
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      
      const formatTime = (h: number, m: number) => {
        const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const ampm = h >= 12 ? "PM" : "AM";
        return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
      };
      
      slots.push({
        start: `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`,
        end: `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`,
        label: formatTime(startHour, startMin),
      });
      
      currentMinutes = endMinutes;
    }
    
    // Afternoon slots: 1:00 PM - 5:00 PM
    currentMinutes = 13 * 60; // Start at 1:00 PM
    const afternoonEnd = 17 * 60; // End at 5:00 PM
    
    while (currentMinutes < afternoonEnd) {
      const startHour = Math.floor(currentMinutes / 60);
      const startMin = currentMinutes % 60;
      const endMinutes = Math.min(currentMinutes + slotDurationMinutes, afternoonEnd);
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      
      const formatTime = (h: number, m: number) => {
        const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const ampm = h >= 12 ? "PM" : "AM";
        return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
      };
      
      slots.push({
        start: `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`,
        end: `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`,
        label: formatTime(startHour, startMin),
      });
      
      currentMinutes = endMinutes;
    }
    
    return slots;
  }, [slotDurationMinutes]);

  // Get appointments for a specific date and time slot
  // Match appointments that start within this slot's time range (regardless of appointment type)
  const getSlotAppointments = (dateStr: string, slotStart: string, slotEnd: string) => {
    return existingAppointments.filter(
      (a: any) =>
        a.appointment_date === dateStr &&
        a.start_time >= slotStart &&
        a.start_time < slotEnd &&
        a.campus_id === selectedCampus
    );
  };

  // Check if slot is available (has capacity)
  const isSlotAvailable = (date: Date, slotStart: string) => {
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay();
    
    // Check if any schedule settings exist for this day and campus (regardless of appointment type)
    const daySettings = scheduleSettings.find(
      (s: any) => s.day_of_week === dayOfWeek && 
      s.campus_id === selectedCampus
    );

    if (!daySettings) return { available: false, maxSlots: 0, bookedCount: 0 };

    // Find the slot end time for this slot
    const slot = timeSlots.find(s => s.start === slotStart);
    const slotEnd = slot?.end || slotStart;
    const bookedCount = getSlotAppointments(dateStr, slotStart, slotEnd).length;
    const maxSlots = (daySettings as any).max_appointments_per_slot || 20;

    return {
      available: bookedCount < maxSlots,
      maxSlots,
      bookedCount,
    };
  };

  const handleLogout = () => {
    fetcher.submit(null, { method: "post", action: "/logout" });
  };

  // Generate week days, filtering out hidden days
  const weekDays: Date[] = [];
  const startDate = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    // Only include days that are not hidden
    if (!hiddenDays.includes(date.getDay())) {
      weekDays.push(date);
    }
  }

  // Check if a day has schedule settings configured (regardless of appointment type)
  const isDayConfigured = (date: Date) => {
    const dayOfWeek = date.getDay();
    return scheduleSettings.some(
      (s: any) => s.day_of_week === dayOfWeek && 
      s.campus_id === selectedCampus
    );
  };

  const getTodayAppointmentsOfType = () => {
    const today = new Date().toISOString().split("T")[0];
    return existingAppointments.filter(
      (a: any) => a.appointment_type === appointmentType && a.appointment_date === today
    ).length;
  };

  const canSchedule = true; // Staff can always schedule

  const handleEditAppointment = (appt: any) => {
    setEditingAppointment(appt);
    setPatientName(appt.patient_name || '');
    setPatientEmail(appt.patient_email || '');
    setPatientContact(appt.patient_contact || '');
    setAppointmentType(appt.appointment_type || 'consultation');
    setShowEditModal(true);
  };

  const handleUpdateDailyLimit = async () => {
    if (confirmLimit !== String(newDailyLimit)) {
      alert("Please type the new limit to confirm");
      return;
    }
    
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await (supabase
        .from("weekly_schedule_limits") as any)
        .update({ max_appointments_per_week: newDailyLimit })
        .eq("appointment_type", appointmentType);
      
      if (error) throw error;
      
      // Refetch data
      fetchData();
      setShowLimitModal(false);
      setConfirmLimit("");
    } catch (error) {
      console.error("Error updating limit:", error);
      alert("Failed to update limit");
    }
  };
  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleSlotSelect = (date: Date, slotStart: string, slotEnd: string) => {
    setSelectedDate(date.toISOString().split("T")[0]);
    setSelectedSlot({ start: slotStart, end: slotEnd });
    setShowModal(true);
  };

  // Helper: Check if a date should be skipped (skip days or holidays)
  const shouldSkipDate = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split("T")[0];
    return hiddenDays.includes(dayOfWeek) || holidays.includes(dateStr);
  };
  
  // Helper: Check if a date is a half day
  const isHalfDay = (date: Date): boolean => {
    return halfDays.includes(date.getDay());
  };
  
  // Helper: Get next valid day (skipping skip days and holidays)
  const getNextValidDay = (date: Date): Date => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    while (shouldSkipDate(next)) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  };
  
  // Helper: Calculate time string from minutes
  const minutesToTime = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  };

  // Reschedule appointments from a specific time onwards - CASCADE to subsequent days
  const handleRescheduleAppointments = async () => {
    if (!rescheduleDate) return;
    
    setIsRescheduling(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const dateStr = rescheduleDate.toISOString().split("T")[0];
      const dailyLimit = getDailyLimitForType();
      
      // Get all appointments for this date from the selected time onwards
      const { data: appointmentsToMove, error: fetchError } = await supabase
        .from("appointments")
        .select("*")
        .eq("appointment_date", dateStr)
        .eq("campus_id", selectedCampus)
        .gte("start_time", rescheduleFromTime)
        .eq("status", "scheduled")
        .order("start_time", { ascending: true });
      
      if (fetchError) throw fetchError;
      
      if (!appointmentsToMove || appointmentsToMove.length === 0) {
        setShowSuccessAlert(true);
        setSuccessMessage("No appointments to reschedule from that time.");
        setShowRescheduleModal(false);
        setIsRescheduling(false);
        return;
      }
      
      // Get slot duration
      const slotDuration = Math.max(10, Math.floor(480 / dailyLimit));
      
      // Get next valid day (skip holidays and skip days)
      let targetDate = getNextValidDay(rescheduleDate);
      
      // Get ALL future scheduled appointments from target day onwards for this campus
      const { data: futureAppointments } = await supabase
        .from("appointments")
        .select("*")
        .eq("campus_id", selectedCampus)
        .gte("appointment_date", targetDate.toISOString().split("T")[0])
        .eq("status", "scheduled")
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });
      
      // Combine: moved appointments first, then existing future appointments
      const allAppointmentsToReassign = [
        ...(appointmentsToMove as any[]),
        ...((futureAppointments || []) as any[])
      ];
      
      // Remove duplicates (in case moved appointments were already in future)
      const uniqueAppointments = allAppointmentsToReassign.filter((appt, index, self) =>
        index === self.findIndex((a) => a.id === appt.id)
      );
      
      // Redistribute appointments
      let currentDate = new Date(targetDate);
      let slotIndex = 0;
      let appointmentsOnCurrentDay = 0;
      
      // Calculate max slots for current day (half day = morning only)
      const getMaxSlotsForDay = (date: Date): number => {
        if (isHalfDay(date)) {
          // Half day: 8 AM to 12 PM = 4 hours = 240 minutes
          return Math.floor(240 / slotDuration);
        }
        // Full day: 8 AM to 5 PM minus lunch = 8 hours = 480 minutes
        return Math.floor(480 / slotDuration);
      };
      
      let maxSlotsToday = getMaxSlotsForDay(currentDate);
      
      for (const appt of uniqueAppointments) {
        // If we've hit the daily limit or max slots, move to next valid day
        while (appointmentsOnCurrentDay >= dailyLimit || appointmentsOnCurrentDay >= maxSlotsToday) {
          currentDate = getNextValidDay(currentDate);
          slotIndex = 0;
          appointmentsOnCurrentDay = 0;
          maxSlotsToday = getMaxSlotsForDay(currentDate);
        }
        
        // Calculate slot time
        let currentMinutes = 8 * 60 + (slotIndex * slotDuration);
        
        // For half days, stop at 12 PM
        if (isHalfDay(currentDate) && currentMinutes >= 12 * 60) {
          currentDate = getNextValidDay(currentDate);
          slotIndex = 0;
          appointmentsOnCurrentDay = 0;
          maxSlotsToday = getMaxSlotsForDay(currentDate);
          currentMinutes = 8 * 60;
        }
        
        // Skip lunch break (12:00 - 13:00) for full days
        if (!isHalfDay(currentDate) && currentMinutes >= 12 * 60 && currentMinutes < 13 * 60) {
          currentMinutes = 13 * 60;
          slotIndex = Math.floor((currentMinutes - 8 * 60) / slotDuration);
        }
        
        const newStartTime = minutesToTime(currentMinutes);
        const newEndTime = minutesToTime(currentMinutes + slotDuration);
        const newDateStr = currentDate.toISOString().split("T")[0];
        
        // Update the appointment
        await (supabase.from("appointments") as any).update({
          appointment_date: newDateStr,
          start_time: newStartTime,
          end_time: newEndTime,
        }).eq("id", appt.id);
        
        slotIndex++;
        appointmentsOnCurrentDay++;
      }
      
      const totalMoved = appointmentsToMove.length;
      const totalReassigned = uniqueAppointments.length;
      
      setShowSuccessAlert(true);
      setSuccessMessage(`${totalMoved} appointment(s) moved. ${totalReassigned} total redistributed.`);
      setShowRescheduleModal(false);
      fetchData();
    } catch (error) {
      console.error("Error rescheduling:", error);
      alert("Failed to reschedule appointments");
    } finally {
      setIsRescheduling(false);
    }
  };
  
  // Handle marking a day as holiday and moving its appointments
  const handleMarkHoliday = async () => {
    if (!rescheduleDate) return;
    
    const dateStr = rescheduleDate.toISOString().split("T")[0];
    
    // Add to holidays list
    if (!holidays.includes(dateStr)) {
      setHolidays([...holidays, dateStr]);
    }
    
    // Set reschedule from time to start of day to move all appointments
    setRescheduleFromTime("08:00:00");
    
    // Trigger reschedule
    await handleRescheduleAppointments();
  };

  // Handle sending email reminders
  const handleSendReminders = async () => {
    setIsSendingEmails(true);
    setEmailResult(null);
    
    try {
      let targetDate: string;
      if (emailTarget === "today") {
        targetDate = "today";
      } else if (emailTarget === "tomorrow") {
        targetDate = "tomorrow";
      } else {
        targetDate = customEmailDate;
      }

      const formData = new FormData();
      formData.append("targetDate", targetDate);
      formData.append("campusId", selectedCampus);

      const response = await fetch("/api/send-reminders", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setEmailResult({
        sent: result.sent || 0,
        skipped: result.skipped || 0,
        failed: result.failed || 0,
      });

      if (result.sent > 0) {
        setShowSuccessAlert(true);
        setSuccessMessage(result.message);
      }
    } catch (error: any) {
      alert(`Failed to send reminders: ${error.message}`);
    } finally {
      setIsSendingEmails(false);
    }
  };

  return (
    <Layout user={profile} onLogout={handleLogout}>
      <div className="max-w-[95%] mx-auto px-2 sm:px-3 lg:px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Schedule Appointment</h1>
          <p className="text-gray-600 mt-1">
            Select a date and time slot for your appointment.
          </p>
        </div>

        {/* Success Alert */}
        {showSuccessAlert && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="bg-green-50 border border-green-200 rounded-xl shadow-lg p-4 flex items-center max-w-md">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-800">Success!</p>
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
              <button 
                onClick={() => setShowSuccessAlert(false)}
                className="ml-3 text-green-500 hover:text-green-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {getTodayAppointmentsOfType() >= getDailyLimitForType() && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Daily Limit Reached</p>
              <p className="text-sm text-yellow-700">
                Today's limit of {getDailyLimitForType()} {appointmentType.replace("_", " ")} 
                appointment(s) has been reached. You can still book for other days.
              </p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                id="campus"
                label="Campus"
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                options={campuses.map((c: any) => ({ value: c.id, label: c.name }))}
              />

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500">Daily Limit</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewDailyLimit(getDailyLimitForType());
                      setShowLimitModal(true);
                    }}
                    className="text-xs text-maroon-600 hover:text-maroon-800 underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-lg font-semibold text-maroon-800">
                  {getTodayAppointmentsOfType()} / {getDailyLimitForType()}
                </p>
                <p className="text-xs text-gray-400">
                  {appointmentType.replace("_", " ")} appointments today
                </p>
              </div>

              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowSettingsModal(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>

              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowEmailModal(true);
                    setEmailResult(null);
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reminders
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Week of {formatDate(weekStart)}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    disabled={isLoading}
                    onClick={() => setWeekOffset(prev => prev - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    disabled={weekOffset >= 4 || isLoading}
                    onClick={() => setWeekOffset(prev => prev + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Google Calendar-like Grid - Single table with sticky header */}
                <div className="max-h-[700px] overflow-auto">
                  <table className="w-full border-collapse" style={{ minWidth: `${Math.max(600, weekDays.length * 140 + 70)}px`, tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '70px' }} />
                      {weekDays.map((_, idx) => (
                        <col key={idx} />
                      ))}
                    </colgroup>
                    {/* Header row with days - sticky */}
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr className="border-b">
                        <th className="p-3 text-center text-xs font-medium text-gray-500 border-r bg-gray-50" style={{ width: '80px' }}>
                          Time
                        </th>
                        {weekDays.map((date, idx) => {
                          const isDisabled = isPastDate(date);
                          const isConfigured = isDayConfigured(date);
                          const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                          const dayNum = date.getDate();
                          const monthName = date.toLocaleDateString("en-US", { month: "short" });
                          const isToday = new Date().toDateString() === date.toDateString();

                          return (
                            <th
                              key={date.toISOString()}
                              className={`p-2 text-center border-r font-normal cursor-pointer hover:bg-gray-100 transition-colors ${
                                idx === weekDays.length - 1 ? "border-r-0" : ""
                              } ${isDisabled ? "opacity-50" : ""} ${isToday ? "bg-maroon-50 hover:bg-maroon-100" : "bg-gray-50"}`}
                              onClick={() => {
                                if (!isDisabled && isConfigured) {
                                  setRescheduleDate(date);
                                  setShowRescheduleModal(true);
                                }
                              }}
                            >
                              <p className="text-xs font-medium text-gray-500">{dayName}</p>
                              <p className={`text-lg font-bold ${
                                isToday ? "text-maroon-700" : "text-gray-900"
                              }`}>
                                {monthName} {dayNum}
                              </p>
                              {!isConfigured && (
                                <span className="text-xs text-gray-400">Not available</span>
                              )}
                              {isConfigured && !isDisabled && (
                                <span className="text-xs text-maroon-500 hover:underline">Click to manage</span>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot, slotIndex) => (
                        <tr
                          key={slot.start}
                          className={`border-b last:border-b-0 ${
                            slotIndex % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                          }`}
                        >
                          {/* Time label */}
                          <td className="p-2 text-xs text-gray-500 border-r text-center font-medium align-middle" style={{ width: '80px', height: '56px' }}>
                            {slot.label}
                          </td>

                          {/* Day cells */}
                          {weekDays.map((date, idx) => {
                            const dateStr = date.toISOString().split("T")[0];
                            const isDisabled = isPastDate(date);
                            const isConfigured = isDayConfigured(date);
                            const slotInfo = isSlotAvailable(date, slot.start);
                            const appointments = getSlotAppointments(dateStr, slot.start, slot.end);
                            const isToday = new Date().toDateString() === date.toDateString();

                            if (!isConfigured) {
                              return (
                                <td
                                  key={`${dateStr}-${slot.start}`}
                                  className={`p-1 border-r bg-gray-100 align-top ${idx === weekDays.length - 1 ? "border-r-0" : ""}`}
                                  style={{ height: '56px' }}
                                />
                              );
                            }

                            return (
                              <td
                                key={`${dateStr}-${slot.start}`}
                                className={`p-1 border-r align-top ${idx === weekDays.length - 1 ? "border-r-0" : ""} ${
                                  isToday ? "bg-maroon-50/30" : ""
                                }`}
                                style={{ height: '56px' }}
                              >
                                {/* Show booked appointment - only 1 per slot */}
                                {appointments.length > 0 && (
                                  <div>
                                    {(() => {
                                      const appt = appointments[0];
                                      const typeLabel = appt.appointment_type === 'physical_exam' ? 'PE' : 'C';
                                      
                                      // Color based on status
                                      let statusBg = '';
                                      let statusIndicator = '';
                                      if (appt.status === 'completed') {
                                        statusBg = 'bg-green-100 text-green-800 border-l-4 border-green-500';
                                        statusIndicator = '✓';
                                      } else if (appt.status === 'cancelled') {
                                        statusBg = 'bg-red-100 text-red-800 border-l-4 border-red-500 line-through opacity-60';
                                        statusIndicator = '✗';
                                      } else if (appt.status === 'no_show') {
                                        statusBg = 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500';
                                        statusIndicator = '?';
                                      } else {
                                        // Scheduled - use type color
                                        statusBg = appt.appointment_type === 'physical_exam' ? 'bg-blue-100 text-blue-800' : 'bg-maroon-100 text-maroon-800';
                                      }
                                      
                                      return (
                                        <div
                                          key={appt.id}
                                          className={`text-xs ${statusBg} px-2 py-0.5 rounded truncate flex items-center cursor-pointer hover:opacity-80`}
                                          title={`${appt.patient_name || 'Patient'} - ${appt.appointment_type?.replace('_', ' ')} - ${appt.status?.replace('_', ' ')}`}
                                          onClick={() => handleEditAppointment(appt)}
                                        >
                                          {statusIndicator && <span className="font-bold mr-1">{statusIndicator}</span>}
                                          {!statusIndicator && <span className="font-bold mr-1">[{typeLabel}]</span>}
                                          <User className="w-3 h-3 mr-1 flex-shrink-0" />
                                          <span className="truncate">
                                            {appt.patient_name || `${appt.patient?.first_name || ''} ${appt.patient?.last_name || ''}`}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}

                                {/* Book button if slot is available */}
                                {slotInfo.available && !isDisabled && canSchedule && appointments.length === 0 && (
                                  <button
                                    onClick={() => handleSlotSelect(date, slot.start, slot.end)}
                                    className="w-full text-xs py-1 px-2 rounded border border-dashed border-maroon-300 text-maroon-600 hover:bg-maroon-50 hover:border-solid transition-colors flex items-center justify-center"
                                  >
                                    <Clock className="w-3 h-3 mr-1" />
                                    Book
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Book Appointment"
          size="lg"
        >
          <Form method="post" className="space-y-4">
            <input type="hidden" name="appointmentDate" value={selectedDate || ""} />
            <input type="hidden" name="startTime" value={selectedSlot?.start || ""} />
            <input type="hidden" name="endTime" value={selectedSlot?.end || ""} />

            {actionData?.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {actionData.error}
              </div>
            )}

            <div className="bg-maroon-50 rounded-lg p-4">
              <h4 className="font-medium text-maroon-900 mb-2">Appointment Details</h4>
              <div className="space-y-1 text-sm text-maroon-700">
                <p><strong>Date:</strong> {selectedDate && formatDate(selectedDate)}</p>
                <p><strong>Time:</strong> {selectedSlot && `${formatTime(selectedSlot.start)} - ${formatTime(selectedSlot.end)}`}</p>
              </div>
            </div>

            <Select
              id="appointmentType"
              name="appointmentType"
              label="Appointment Type"
              value={appointmentType}
              onChange={(e) => setAppointmentType(e.target.value as "physical_exam" | "consultation")}
              options={[
                { value: "consultation", label: "Consultation" },
                { value: "physical_exam", label: "Physical Exam" },
              ]}
            />
            <input type="hidden" name="campusId" value={selectedCampus} />

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Patient Information</h4>
              
              <Input
                id="patientName"
                name="patientName"
                label="Patient Full Name"
                placeholder="Enter patient's full name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-4 mt-3">
                <Input
                  id="patientEmail"
                  name="patientEmail"
                  type="email"
                  label="Patient Email (Optional)"
                  placeholder="patient@email.com"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number (Optional)
                  </label>
                  <input
                    id="patientContact"
                    name="patientContact"
                    type="tel"
                    placeholder="09XXXXXXXXX"
                    value={patientContact}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setPatientContact(value);
                    }}
                    maxLength={11}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 ${
                      patientContact && patientContact.length !== 11 ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {patientContact && patientContact.length !== 11 && (
                    <p className="text-xs text-red-500 mt-1">
                      Contact number must be exactly 11 digits ({patientContact.length}/11)
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Input
              id="chiefComplaint"
              name="chiefComplaint"
              label="Chief Complaint / Reason for Visit"
              placeholder="Describe symptoms or reason for visit"
            />

            <Select
              id="doctorId"
              name="doctorId"
              label="Assigned Doctor (Optional)"
              placeholder="Any available doctor"
              options={doctors.map((d: any) => ({
                value: d.id,
                label: `Dr. ${d.profiles?.first_name || ''} ${d.profiles?.last_name || ''}`.trim() || 'Unknown Doctor',
              }))}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting} disabled={!patientName.trim()}>
                Book Appointment
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Edit Appointment Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingAppointment(null);
          }}
          title="Edit Appointment"
          size="lg"
        >
          {editingAppointment && (
            <div className="space-y-4">
              <div className="bg-maroon-50 rounded-lg p-4">
                <h4 className="font-medium text-maroon-900 mb-2">Appointment Details</h4>
                <div className="space-y-1 text-sm text-maroon-700">
                  <p><strong>Date:</strong> {editingAppointment.appointment_date && formatDate(editingAppointment.appointment_date)}</p>
                  <p><strong>Time:</strong> {formatTime(editingAppointment.start_time)} - {formatTime(editingAppointment.end_time)}</p>
                  <p><strong>Campus:</strong> {campuses.find((c: any) => c.id === editingAppointment.campus_id)?.name}</p>
                </div>
              </div>

              <Select
                id="editAppointmentType"
                label="Appointment Type"
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value as "physical_exam" | "consultation")}
                options={[
                  { value: "consultation", label: "Consultation" },
                  { value: "physical_exam", label: "Physical Exam" },
                ]}
              />

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Patient Information</h4>
                
                <Input
                  id="editPatientName"
                  label="Patient Full Name"
                  placeholder="Enter patient's full name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                />

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <Input
                    id="editPatientEmail"
                    type="email"
                    label="Patient Email (Optional)"
                    placeholder="patient@email.com"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                  />
                  <Input
                    id="editPatientContact"
                    label="Contact Number (Optional)"
                    placeholder="09XXXXXXXXX"
                    value={patientContact}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setPatientContact(value);
                    }}
                  />
                </div>
              </div>

              {/* Status Update Section */}
              {editingAppointment.status === 'scheduled' && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Update Status</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={async () => {
                        const supabase = createSupabaseBrowserClient();
                        await (supabase.from('appointments') as any).update({ status: 'completed' }).eq('id', editingAppointment.id);
                        setShowEditModal(false);
                        setEditingAppointment(null);
                        fetchData();
                        setShowSuccessAlert(true);
                        setSuccessMessage('Appointment marked as completed');
                      }}
                    >
                      ✓ Completed
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-yellow-600 border-yellow-400 hover:bg-yellow-50"
                      onClick={async () => {
                        const supabase = createSupabaseBrowserClient();
                        await (supabase.from('appointments') as any).update({ status: 'no_show' }).eq('id', editingAppointment.id);
                        setShowEditModal(false);
                        setEditingAppointment(null);
                        fetchData();
                        setShowSuccessAlert(true);
                        setSuccessMessage('Appointment marked as no show');
                      }}
                    >
                      No Show
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={async () => {
                        if (confirm('Are you sure you want to cancel this appointment?')) {
                          const supabase = createSupabaseBrowserClient();
                          await (supabase.from('appointments') as any).update({ status: 'cancelled' }).eq('id', editingAppointment.id);
                          setShowEditModal(false);
                          setEditingAppointment(null);
                          fetchData();
                          setShowSuccessAlert(true);
                          setSuccessMessage('Appointment cancelled');
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Show current status if not scheduled */}
              {editingAppointment.status !== 'scheduled' && (
                <div className="border-t pt-4">
                  <div className={`p-3 rounded-lg text-center font-medium ${
                    editingAppointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    editingAppointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    editingAppointment.status === 'no_show' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    Status: {editingAppointment.status?.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => {
                  setShowEditModal(false);
                  setEditingAppointment(null);
                }}>
                  Close
                </Button>
                <Button 
                  type="button"
                  onClick={async () => {
                    const supabase = createSupabaseBrowserClient();
                    await (supabase.from('appointments') as any).update({
                      patient_name: patientName,
                      patient_email: patientEmail,
                      patient_contact: patientContact,
                      appointment_type: appointmentType,
                    }).eq('id', editingAppointment.id);
                    setShowEditModal(false);
                    setEditingAppointment(null);
                    fetchData();
                    setShowSuccessAlert(true);
                    setSuccessMessage('Appointment updated successfully');
                  }}
                  disabled={!patientName.trim()}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Reschedule Appointments Modal */}
        <Modal
          isOpen={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          title="Manage Day Schedule"
          size="md"
        >
          {rescheduleDate && (
            <div className="space-y-4">
              <div className="bg-maroon-50 rounded-lg p-4">
                <p className="font-medium text-maroon-900">
                  {rescheduleDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-sm text-maroon-700 mt-1">
                  {existingAppointments.filter((a: any) => 
                    a.appointment_date === rescheduleDate.toISOString().split("T")[0] && 
                    a.campus_id === selectedCampus
                  ).length} appointment(s) scheduled
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Reschedule Remaining Appointments</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Move all appointments from a specific time onwards to the next business day. 
                  Useful when the doctor becomes unavailable (e.g., afternoon session cancelled).
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reschedule appointments starting from:
                  </label>
                  <select
                    value={rescheduleFromTime}
                    onChange={(e) => setRescheduleFromTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
                  >
                    <option value="08:00:00">8:00 AM (All day)</option>
                    <option value="09:00:00">9:00 AM</option>
                    <option value="10:00:00">10:00 AM</option>
                    <option value="11:00:00">11:00 AM</option>
                    <option value="13:00:00">1:00 PM (Afternoon only)</option>
                    <option value="14:00:00">2:00 PM</option>
                    <option value="15:00:00">3:00 PM</option>
                    <option value="16:00:00">4:00 PM</option>
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Appointments will be moved to the next available slots on the next business day, 
                    preserving their order. If the next day is full, they will cascade to subsequent days.
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={handleMarkHoliday}
                  disabled={isRescheduling}
                >
                  Mark as Holiday
                </Button>
                <div className="flex space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowRescheduleModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    onClick={handleRescheduleAppointments}
                    disabled={isRescheduling}
                    isLoading={isRescheduling}
                  >
                    Reschedule Appointments
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Edit Daily Limit Modal */}
        <Modal
          isOpen={showLimitModal}
          onClose={() => {
            setShowLimitModal(false);
            setConfirmLimit("");
          }}
          title="Edit Daily Limit"
          size="sm"
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Changing the daily limit will affect how many {appointmentType.replace("_", " ")} appointments can be booked per day.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Daily Limit for {appointmentType.replace("_", " ")}
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={newDailyLimit}
                onChange={(e) => setNewDailyLimit(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type "{newDailyLimit}" to confirm
              </label>
              <input
                type="text"
                value={confirmLimit}
                onChange={(e) => setConfirmLimit(e.target.value)}
                placeholder={`Type ${newDailyLimit} to confirm`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowLimitModal(false);
                  setConfirmLimit("");
                }}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleUpdateDailyLimit}
                disabled={confirmLimit !== String(newDailyLimit)}
              >
                Update Limit
              </Button>
            </div>
          </div>
        </Modal>

        {/* Settings Modal */}
        <Modal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          title="Calendar Settings"
          size="md"
        >
          <div className="space-y-6">
            {/* Hidden Days */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Hide Days</h4>
              <p className="text-sm text-gray-600 mb-3">
                Hidden days will not appear on the calendar and will be skipped when rescheduling.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { day: 0, label: "Sun" },
                  { day: 1, label: "Mon" },
                  { day: 2, label: "Tue" },
                  { day: 3, label: "Wed" },
                  { day: 4, label: "Thu" },
                  { day: 5, label: "Fri" },
                  { day: 6, label: "Sat" },
                ].map(({ day, label }) => (
                  <label
                    key={day}
                    className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-colors ${
                      hiddenDays.includes(day)
                        ? "bg-maroon-100 border-maroon-500 text-maroon-800"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={hiddenDays.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setHiddenDays([...hiddenDays, day]);
                        } else {
                          setHiddenDays(hiddenDays.filter((d) => d !== day));
                        }
                      }}
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Half Days */}
            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-900 mb-2">Half Days</h4>
              <p className="text-sm text-gray-600 mb-3">
                These days will only have morning slots (8 AM - 12 PM) when rescheduling.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { day: 0, label: "Sun" },
                  { day: 1, label: "Mon" },
                  { day: 2, label: "Tue" },
                  { day: 3, label: "Wed" },
                  { day: 4, label: "Thu" },
                  { day: 5, label: "Fri" },
                  { day: 6, label: "Sat" },
                ].map(({ day, label }) => (
                  <label
                    key={day}
                    className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-colors ${
                      halfDays.includes(day)
                        ? "bg-blue-100 border-blue-500 text-blue-800"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    } ${hiddenDays.includes(day) ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={halfDays.includes(day)}
                      disabled={hiddenDays.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setHalfDays([...halfDays, day]);
                        } else {
                          setHalfDays(halfDays.filter((d) => d !== day));
                        }
                      }}
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Holidays */}
            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-900 mb-2">Holidays</h4>
              <p className="text-sm text-gray-600 mb-3">
                Specific dates to skip when rescheduling. Appointments on holidays will be moved.
              </p>
              
              <div className="flex space-x-2 mb-3">
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newHolidayDate && !holidays.includes(newHolidayDate)) {
                      setHolidays([...holidays, newHolidayDate].sort());
                      setNewHolidayDate("");
                    }
                  }}
                  disabled={!newHolidayDate}
                >
                  Add
                </Button>
              </div>

              {holidays.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {holidays.map((date) => (
                    <div
                      key={date}
                      className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-red-800">
                        {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setHolidays(holidays.filter((h) => h !== date))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No holidays added</p>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                type="button"
                onClick={() => setShowSettingsModal(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>

        {/* Email Reminders Modal */}
        <Modal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          title="Send Email Reminders"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Send appointment reminder emails to patients scheduled for a specific date.
              Only patients with valid email addresses will receive reminders.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send reminders for:
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="emailTarget"
                    value="today"
                    checked={emailTarget === "today"}
                    onChange={() => setEmailTarget("today")}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">Today</span>
                    <p className="text-xs text-gray-500">
                      {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="emailTarget"
                    value="tomorrow"
                    checked={emailTarget === "tomorrow"}
                    onChange={() => setEmailTarget("tomorrow")}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">Tomorrow</span>
                    <p className="text-xs text-gray-500">
                      {(() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        return tomorrow.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
                      })()}
                    </p>
                  </div>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="emailTarget"
                    value="custom"
                    checked={emailTarget === "custom"}
                    onChange={() => setEmailTarget("custom")}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-medium">Custom Date</span>
                    {emailTarget === "custom" && (
                      <input
                        type="date"
                        value={customEmailDate}
                        onChange={(e) => setCustomEmailDate(e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    )}
                  </div>
                </label>
              </div>
            </div>

            {emailResult && (
              <div className="bg-gray-50 border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Results:</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{emailResult.sent}</p>
                    <p className="text-xs text-gray-500">Sent</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{emailResult.skipped}</p>
                    <p className="text-xs text-gray-500">No Email</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{emailResult.failed}</p>
                    <p className="text-xs text-gray-500">Failed</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This will send emails to all scheduled appointments for the selected date 
                in the currently selected campus. Use sparingly to conserve email quota.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEmailModal(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleSendReminders}
                disabled={isSendingEmails || (emailTarget === "custom" && !customEmailDate)}
                isLoading={isSendingEmails}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Reminders
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
