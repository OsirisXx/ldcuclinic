import type { MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight, User, ArrowLeft } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardContent, Select, Modal } from "~/components/ui";
import { createSupabaseBrowserClient } from "~/lib/supabase.client";
import { getWeekBounds, formatDate, formatTime } from "~/lib/utils";

export const meta: MetaFunction = () => {
  return [
    { title: "View Schedules - Liceo Clinic" },
    { name: "description", content: "View upcoming clinic schedules at Liceo de Cagayan University" },
  ];
};

export async function loader() {
  return json({});
}

export default function ViewSchedules() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedCampus, setSelectedCampus] = useState<string>("");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Client-side data fetching state
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleSettings, setScheduleSettings] = useState<any[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [weeklyLimits, setWeeklyLimits] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);

  // Calculate week bounds
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const { start: weekStart, end: weekEnd } = getWeekBounds(baseDate);

  // Get daily limit (use consultation as default)
  const getDailyLimitForType = useCallback(() => {
    const limit = weeklyLimits.find(
      (l: any) => l.appointment_type === 'consultation'
    );
    return limit?.max_appointments_per_week || 20;
  }, [weeklyLimits]);

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
        limitsRes,
        campusesRes,
      ] = await Promise.all([
        supabase.from("schedule_settings").select("*").eq("is_active", true),
        supabase.from("appointments").select(`*`)
          .gte("appointment_date", weekStartStr)
          .lte("appointment_date", weekEndStr),
        supabase.from("weekly_schedule_limits").select("*"),
        supabase.from("campuses").select("*"),
      ]);

      setScheduleSettings(settingsRes.data || []);
      setExistingAppointments(appointmentsRes.data || []);
      setWeeklyLimits(limitsRes.data || []);
      setCampuses(campusesRes.data || []);
      
      // Set default campus to first campus if not set
      if (!selectedCampus && campusesRes.data && campusesRes.data.length > 0) {
        setSelectedCampus((campusesRes.data[0] as any).id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [weekOffset, selectedCampus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate slot duration based on daily limit
  const totalMinutesPerDay = 480;
  const dailyLimit = getDailyLimitForType();
  const slotDurationMinutes = Math.max(10, Math.floor(totalMinutesPerDay / dailyLimit));

  // Generate dynamic time slots based on daily limit
  const timeSlots = useMemo(() => {
    const slots: { start: string; end: string; label: string }[] = [];
    
    // Morning slots: 8:00 AM - 12:00 PM
    let currentMinutes = 8 * 60;
    const morningEnd = 12 * 60;
    
    while (currentMinutes < morningEnd) {
      const startHour = Math.floor(currentMinutes / 60);
      const startMin = currentMinutes % 60;
      const endMinutes = Math.min(currentMinutes + slotDurationMinutes, morningEnd);
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      
      const formatTimeLabel = (h: number, m: number) => {
        const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const ampm = h >= 12 ? "PM" : "AM";
        return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
      };
      
      slots.push({
        start: `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`,
        end: `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`,
        label: formatTimeLabel(startHour, startMin),
      });
      
      currentMinutes = endMinutes;
    }
    
    // Afternoon slots: 1:00 PM - 5:00 PM
    currentMinutes = 13 * 60;
    const afternoonEnd = 17 * 60;
    
    while (currentMinutes < afternoonEnd) {
      const startHour = Math.floor(currentMinutes / 60);
      const startMin = currentMinutes % 60;
      const endMinutes = Math.min(currentMinutes + slotDurationMinutes, afternoonEnd);
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      
      const formatTimeLabel = (h: number, m: number) => {
        const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const ampm = h >= 12 ? "PM" : "AM";
        return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
      };
      
      slots.push({
        start: `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`,
        end: `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`,
        label: formatTimeLabel(startHour, startMin),
      });
      
      currentMinutes = endMinutes;
    }
    
    return slots;
  }, [slotDurationMinutes]);

  // Get appointments for a specific date and time slot (all types)
  const getSlotAppointments = (dateStr: string, slotStart: string, slotEnd: string) => {
    return existingAppointments.filter(
      (a: any) =>
        a.appointment_date === dateStr &&
        a.start_time >= slotStart &&
        a.start_time < slotEnd &&
        a.campus_id === selectedCampus
    );
  };

  const weekDays: Date[] = [];
  const startDate = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    weekDays.push(date);
  }

  // Check if a day has schedule settings configured (any appointment type)
  const isDayConfigured = (date: Date) => {
    const dayOfWeek = date.getDay();
    return scheduleSettings.some(
      (s: any) => s.day_of_week === dayOfWeek && 
      s.campus_id === selectedCampus
    );
  };

  // Check if date is in the past
  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Only show upcoming schedules (today and future)
  const isUpcoming = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-maroon-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gold-500 rounded-full flex items-center justify-center">
                <span className="text-maroon-900 font-bold text-xl">L</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Liceo Clinic</h1>
                <p className="text-sm text-gold-300">View Schedules</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/">
                <Button variant="ghost" className="text-white hover:bg-maroon-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary">Staff Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[95%] mx-auto px-2 sm:px-3 lg:px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Clinic Schedule</h1>
          <p className="text-gray-600 mt-1">
            View upcoming appointment schedules. Visit the clinic to book your appointment.
          </p>
        </div>

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
                <p className="text-sm text-gray-500 mb-2">How to Book</p>
                <p className="text-xs text-gray-600">
                  Visit the clinic and speak with our staff to schedule your appointment.
                </p>
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
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-800"></div>
                    <span className="ml-3 text-gray-600">Loading schedule...</span>
                  </div>
                ) : (
                  <div className="max-h-[700px] overflow-auto">
                    <table className="w-full border-collapse" style={{ minWidth: '1000px', tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '70px' }} />
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                      </colgroup>
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr className="border-b">
                          <th className="p-3 text-center text-xs font-medium text-gray-500 border-r bg-gray-50" style={{ width: '80px' }}>
                            Time
                          </th>
                          {weekDays.map((date, idx) => {
                            const isConfigured = isDayConfigured(date);
                            const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                            const dayNum = date.getDate();
                            const monthName = date.toLocaleDateString("en-US", { month: "short" });
                            const isToday = new Date().toDateString() === date.toDateString();
                            const isPast = isPastDate(date);

                            return (
                              <th
                                key={date.toISOString()}
                                className={`p-2 text-center border-r font-normal ${
                                  idx === 6 ? "border-r-0" : ""
                                } ${isPast ? "opacity-50" : ""} ${isToday ? "bg-maroon-50" : "bg-gray-50"}`}
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
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map((slot) => (
                          <tr key={slot.start} className="border-b hover:bg-gray-50/50">
                            <td className="p-2 text-xs text-gray-500 border-r text-center font-medium align-middle" style={{ width: '80px', height: '56px' }}>
                              {slot.label}
                            </td>

                            {weekDays.map((date, idx) => {
                              const dateStr = date.toISOString().split("T")[0];
                              const isConfigured = isDayConfigured(date);
                              const appointments = getSlotAppointments(dateStr, slot.start, slot.end);
                              const isToday = new Date().toDateString() === date.toDateString();
                              const isPast = isPastDate(date);

                              if (!isConfigured || isPast) {
                                return (
                                  <td
                                    key={`${dateStr}-${slot.start}`}
                                    className={`p-1 border-r bg-gray-100 align-top ${idx === 6 ? "border-r-0" : ""}`}
                                    style={{ height: '56px' }}
                                  />
                                );
                              }

                              return (
                                <td
                                  key={`${dateStr}-${slot.start}`}
                                  className={`p-1 border-r align-top ${idx === 6 ? "border-r-0" : ""} ${
                                    isToday ? "bg-maroon-50/30" : ""
                                  }`}
                                  style={{ height: '56px' }}
                                >
                                  {appointments.length > 0 && (
                                    <div className="space-y-1 mb-1">
                                      {appointments.slice(0, 1).map((appt: any, i: number) => {
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
                                            key={appt.id || i}
                                            className={`text-xs ${statusBg} px-2 py-0.5 rounded truncate flex items-center cursor-pointer hover:opacity-80`}
                                            title={`${appt.patient_name || "Patient"} - ${appt.appointment_type?.replace("_", " ") || ""} - ${appt.status?.replace("_", " ") || ""}`}
                                            onClick={() => {
                                              setSelectedAppointment(appt);
                                              setShowDetailsModal(true);
                                            }}
                                          >
                                            {statusIndicator && <span className="font-bold mr-1">{statusIndicator}</span>}
                                            {!statusIndicator && <span className="font-bold mr-1">[{typeLabel}]</span>}
                                            <User className="w-3 h-3 mr-1 flex-shrink-0" />
                                            <span className="truncate">
                                              {appt.patient_name || "Booked"}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {appointments.length === 0 && (
                                    <div className="text-xs text-green-600 px-1 py-0.5">
                                      Available
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="bg-maroon-50 border border-maroon-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-maroon-900 mb-2">Want to Book an Appointment?</h3>
          <p className="text-maroon-700 mb-4">
            Visit the Liceo de Cagayan University Clinic and our staff will assist you in scheduling your appointment.
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-maroon-600">
            <Clock className="w-4 h-4" />
            <span>Clinic Hours: Monday - Friday, 8:00 AM - 5:00 PM</span>
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedAppointment(null);
        }}
        title="Appointment Details"
        size="sm"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="bg-maroon-50 rounded-lg p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Patient Name</p>
                  <p className="text-lg font-semibold text-maroon-900">
                    {selectedAppointment.patient_name || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Campus</p>
                  <p className="text-md font-medium text-maroon-800">
                    {campuses.find((c: any) => c.id === selectedAppointment.campus_id)?.name || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
                  <p className="text-md font-medium text-maroon-800">
                    {formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                  <p className="text-md font-medium text-maroon-800">
                    {selectedAppointment.appointment_date && formatDate(selectedAppointment.appointment_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Type</p>
                  <p className="text-md font-medium text-maroon-800">
                    {selectedAppointment.appointment_type?.replace("_", " ") || "Not specified"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedAppointment(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Footer */}
      <footer className="bg-maroon-800 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h3 className="font-bold text-lg">Liceo de Cagayan University</h3>
              <p className="text-sm text-gold-300">Clinic Scheduling System</p>
            </div>
            <div className="text-center md:text-right text-sm text-gray-300">
              <p>&copy; {new Date().getFullYear()} Liceo de Cagayan University</p>
              <p className="text-gold-300">All rights reserved</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
