import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useActionData, useNavigation, useFetcher, useSearchParams } from "@remix-run/react";
import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Users,
  Settings,
  Clock,
  Search,
  Filter,
  Edit2,
  Trash2,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Layout } from "~/components/layout";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Modal,
  Input,
  Select,
} from "~/components/ui";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { createSupabaseBrowserClient } from "~/lib/supabase.client";
import { formatDate, formatTime } from "~/lib/utils";

export const meta: MetaFunction = () => {
  return [{ title: "Admin Dashboard - Liceo Clinic" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return redirect("/login", { headers });
  }

  // Use admin client to bypass RLS for profile only
  const { createSupabaseAdminClient } = await import("~/lib/supabase.server");
  const adminClient = createSupabaseAdminClient();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile || !["admin", "doctor", "nurse"].includes(profile.role)) {
    return redirect("/dashboard", { headers });
  }

  // Only return profile - data will be fetched client-side
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "doctor", "nurse"].includes(profile.role)) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "updateStatus") {
    const appointmentId = formData.get("appointmentId") as string;
    const status = formData.get("status") as string;

    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointmentId);

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ success: true });
  }

  if (intent === "markContacted") {
    const appointmentId = formData.get("appointmentId") as string;

    const { error } = await supabase.from("appointment_history").insert({
      appointment_id: appointmentId,
      action: "contacted",
      changed_by: user.id,
      contacted: true,
    });

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ success: true });
  }

  if (intent === "reschedule") {
    const appointmentId = formData.get("appointmentId") as string;
    const newDate = formData.get("newDate") as string;
    const newStartTime = formData.get("newStartTime") as string;
    const newEndTime = formData.get("newEndTime") as string;

    const { error } = await supabase
      .from("appointments")
      .update({
        appointment_date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      })
      .eq("id", appointmentId);

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ success: true });
  }

  if (intent === "deleteAppointment") {
    const appointmentId = formData.get("appointmentId") as string;

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appointmentId);

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ success: true });
  }

  if (intent === "updateScheduleSettings") {
    const settingId = formData.get("settingId") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const slotDuration = formData.get("slotDuration") as string;
    const maxAppointments = formData.get("maxAppointments") as string;
    const isActive = formData.get("isActive") === "true";

    const { error } = await supabase
      .from("schedule_settings")
      .update({
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: parseInt(slotDuration),
        max_appointments_per_slot: parseInt(maxAppointments),
        is_active: isActive,
      })
      .eq("id", settingId);

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ success: true });
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function Admin() {
  const { profile, userId } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const actionData = useActionData<{ error?: string; success?: boolean }>();
  const navigation = useNavigation();
  const fetcher = useFetcher();

  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<any>(null);
  const [showSettingModal, setShowSettingModal] = useState(false);

  // Client-side data fetching state
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [scheduleSettings, setScheduleSettings] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [stats, setStats] = useState({ todayAppointments: 0, totalPatients: 0, pendingAppointments: 0 });

  const tab = searchParams.get("tab") || "appointments";
  const dateFilter = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const statusFilter = searchParams.get("status") || "all";

  // Fetch data client-side
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const today = new Date().toISOString().split("T")[0];

      // Build appointments query
      let appointmentsQuery = supabase
        .from("appointments")
        .select(`*, patients:patient_id(id, first_name, last_name, email, contact_number), doctors:doctor_id(id, profiles:profile_id(first_name, last_name)), campuses:campus_id(name)`)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (dateFilter) {
        appointmentsQuery = appointmentsQuery.eq("appointment_date", dateFilter);
      }
      if (statusFilter !== "all") {
        appointmentsQuery = appointmentsQuery.eq("status", statusFilter);
      }

      const [
        appointmentsRes,
        settingsRes,
        campusesRes,
        doctorsRes,
        todayCountRes,
        totalPatientsRes,
        pendingCountRes,
      ] = await Promise.all([
        appointmentsQuery,
        supabase.from("schedule_settings").select(`*, campuses:campus_id(name)`).order("day_of_week"),
        supabase.from("campuses").select("*"),
        supabase.from("doctors").select(`*, profiles:profile_id(first_name, last_name)`).eq("is_active", true),
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("appointment_date", today).eq("status", "scheduled"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).in("role", ["student", "employee"]),
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "scheduled").gte("appointment_date", today),
      ]);

      setAppointments(appointmentsRes.data || []);
      setScheduleSettings(settingsRes.data || []);
      setCampuses(campusesRes.data || []);
      setDoctors(doctorsRes.data || []);
      setStats({
        todayAppointments: todayCountRes.count || 0,
        totalPatients: totalPatientsRes.count || 0,
        pendingAppointments: pendingCountRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = () => {
    fetcher.submit(null, { method: "post", action: "/logout" });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
      scheduled: "info",
      completed: "success",
      cancelled: "danger",
      no_show: "warning",
    };
    return <Badge variant={variants[status] || "default"}>{status.replace("_", " ")}</Badge>;
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <Layout user={profile} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage appointments, schedules, and settings.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-maroon-800 text-white">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gold-300">Today's Appointments</p>
                <p className="text-3xl font-bold">{stats.todayAppointments}</p>
              </div>
              <Calendar className="w-12 h-12 text-gold-400 opacity-80" />
            </CardContent>
          </Card>

          <Card className="bg-gold-500 text-maroon-900">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-maroon-700">Pending Appointments</p>
                <p className="text-3xl font-bold">{stats.pendingAppointments}</p>
              </div>
              <Clock className="w-12 h-12 text-maroon-700 opacity-80" />
            </CardContent>
          </Card>

          <Card className="bg-green-600 text-white">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-100">Total Patients</p>
                <p className="text-3xl font-bold">{stats.totalPatients}</p>
              </div>
              <Users className="w-12 h-12 text-green-200 opacity-80" />
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="py-4">
            <Form method="get" className="flex flex-wrap gap-2">
              <input type="hidden" name="date" value={dateFilter} />
              <input type="hidden" name="status" value={statusFilter} />
              {[
                { value: "appointments", label: "Appointments", icon: Calendar },
                { value: "settings", label: "Schedule Settings", icon: Settings },
              ].map((option) => (
                <Button
                  key={option.value}
                  type="submit"
                  name="tab"
                  value={option.value}
                  variant={tab === option.value ? "primary" : "outline"}
                  size="sm"
                >
                  <option.icon className="w-4 h-4 mr-1" />
                  {option.label}
                </Button>
              ))}
            </Form>
          </CardContent>
        </Card>

        {tab === "appointments" && (
          <>
            <Card className="mb-6">
              <CardContent className="py-4">
                <Form method="get" className="flex flex-wrap items-end gap-4">
                  <input type="hidden" name="tab" value="appointments" />
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      label="Date"
                      defaultValue={dateFilter}
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <Select
                      id="status"
                      name="status"
                      label="Status"
                      defaultValue={statusFilter}
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "scheduled", label: "Scheduled" },
                        { value: "completed", label: "Completed" },
                        { value: "cancelled", label: "Cancelled" },
                        { value: "no_show", label: "No Show" },
                      ]}
                    />
                  </div>
                  <Button type="submit">
                    <Filter className="w-4 h-4 mr-1" />
                    Filter
                  </Button>
                </Form>
              </CardContent>
            </Card>

            {appointments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                  <p className="text-gray-500">No appointments match your filter criteria.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment: any) => (
                  <Card key={appointment.id}>
                    <CardContent className="py-4">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start space-x-4">
                          <div className="w-14 h-14 bg-maroon-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-7 h-7 text-maroon-800" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {appointment.patients?.first_name} {appointment.patients?.last_name}
                            </p>
                            <p className="text-sm text-gray-500 capitalize">
                              {appointment.patients?.role} • {appointment.patients?.email}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <Phone className="w-3 h-3 mr-1" />
                              {appointment.patients?.contact_number}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-start lg:items-center">
                          <p className="font-medium text-gray-900">
                            {formatDate(appointment.appointment_date)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {appointment.campuses?.name}
                          </p>
                        </div>

                        <div className="flex flex-col items-start lg:items-end space-y-2">
                          <div className="flex space-x-2">
                            <Badge variant={appointment.appointment_type === "physical_exam" ? "default" : "info"}>
                              {appointment.appointment_type === "physical_exam" ? "PE" : "Consult"}
                            </Badge>
                            {getStatusBadge(appointment.status)}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {appointment.status === "scheduled" && (
                              <>
                                <fetcher.Form method="post">
                                  <input type="hidden" name="intent" value="updateStatus" />
                                  <input type="hidden" name="appointmentId" value={appointment.id} />
                                  <input type="hidden" name="status" value="completed" />
                                  <Button type="submit" variant="ghost" size="sm">
                                    <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                                    Complete
                                  </Button>
                                </fetcher.Form>

                                <fetcher.Form method="post">
                                  <input type="hidden" name="intent" value="updateStatus" />
                                  <input type="hidden" name="appointmentId" value={appointment.id} />
                                  <input type="hidden" name="status" value="no_show" />
                                  <Button type="submit" variant="ghost" size="sm">
                                    <XCircle className="w-4 h-4 mr-1 text-yellow-600" />
                                    No Show
                                  </Button>
                                </fetcher.Form>

                                <fetcher.Form method="post">
                                  <input type="hidden" name="intent" value="markContacted" />
                                  <input type="hidden" name="appointmentId" value={appointment.id} />
                                  <Button type="submit" variant="ghost" size="sm">
                                    <Phone className="w-4 h-4 mr-1 text-blue-600" />
                                    Contacted
                                  </Button>
                                </fetcher.Form>
                              </>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setShowRescheduleModal(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4 mr-1" />
                              Reschedule
                            </Button>

                            {profile.role === "admin" && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setShowDeleteModal(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {appointment.chief_complaint && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-gray-600">
                            <strong>Chief Complaint:</strong> {appointment.chief_complaint}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "settings" && (
          <Card>
            <CardHeader>
              <CardTitle>Schedule Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Day</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Campus</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Hours</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Slot Duration</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Max/Slot</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleSettings.map((setting: any) => (
                      <tr key={setting.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{dayNames[setting.day_of_week]}</td>
                        <td className="py-3 px-4">{setting.campuses?.name}</td>
                        <td className="py-3 px-4 capitalize">
                          {setting.appointment_type.replace("_", " ")}
                        </td>
                        <td className="py-3 px-4">
                          {formatTime(setting.start_time)} - {formatTime(setting.end_time)}
                        </td>
                        <td className="py-3 px-4">{setting.slot_duration_minutes} min</td>
                        <td className="py-3 px-4">{setting.max_appointments_per_slot}</td>
                        <td className="py-3 px-4">
                          <Badge variant={setting.is_active ? "success" : "danger"}>
                            {setting.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSetting(setting);
                              setShowSettingModal(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Modal
          isOpen={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          title="Reschedule Appointment"
          size="lg"
        >
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="reschedule" />
            <input type="hidden" name="appointmentId" value={selectedAppointment?.id} />

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-medium">
                {selectedAppointment?.patients?.first_name} {selectedAppointment?.patients?.last_name}
              </p>
              <p className="text-sm text-gray-500">
                Current: {selectedAppointment && formatDate(selectedAppointment.appointment_date)} at{" "}
                {selectedAppointment && formatTime(selectedAppointment.start_time)}
              </p>
            </div>

            <Input
              id="newDate"
              name="newDate"
              type="date"
              label="New Date"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                id="newStartTime"
                name="newStartTime"
                label="Start Time"
                required
                options={[
                  { value: "08:00:00", label: "8:00 AM" },
                  { value: "10:00:00", label: "10:00 AM" },
                  { value: "13:00:00", label: "1:00 PM" },
                  { value: "15:00:00", label: "3:00 PM" },
                ]}
              />
              <Select
                id="newEndTime"
                name="newEndTime"
                label="End Time"
                required
                options={[
                  { value: "10:00:00", label: "10:00 AM" },
                  { value: "12:00:00", label: "12:00 PM" },
                  { value: "15:00:00", label: "3:00 PM" },
                  { value: "17:00:00", label: "5:00 PM" },
                ]}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowRescheduleModal(false)}>
                Cancel
              </Button>
              <Button type="submit" onClick={() => setShowRescheduleModal(false)}>
                Reschedule
              </Button>
            </div>
          </fetcher.Form>
        </Modal>

        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Appointment"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to permanently delete this appointment? This action cannot be undone.
            </p>
            <fetcher.Form method="post" className="flex justify-end space-x-3">
              <input type="hidden" name="intent" value="deleteAppointment" />
              <input type="hidden" name="appointmentId" value={selectedAppointment?.id} />
              <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" onClick={() => setShowDeleteModal(false)}>
                Delete
              </Button>
            </fetcher.Form>
          </div>
        </Modal>

        <Modal
          isOpen={showSettingModal}
          onClose={() => setShowSettingModal(false)}
          title="Edit Schedule Setting"
          size="lg"
        >
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="updateScheduleSettings" />
            <input type="hidden" name="settingId" value={selectedSetting?.id} />

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-medium">{selectedSetting && dayNames[selectedSetting.day_of_week]}</p>
              <p className="text-sm text-gray-500 capitalize">
                {selectedSetting?.appointment_type?.replace("_", " ")} - {selectedSetting?.campuses?.name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="startTime"
                name="startTime"
                type="time"
                label="Start Time"
                defaultValue={selectedSetting?.start_time?.slice(0, 5)}
                required
              />
              <Input
                id="endTime"
                name="endTime"
                type="time"
                label="End Time"
                defaultValue={selectedSetting?.end_time?.slice(0, 5)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="slotDuration"
                name="slotDuration"
                type="number"
                label="Slot Duration (minutes)"
                defaultValue={selectedSetting?.slot_duration_minutes}
                required
              />
              <Input
                id="maxAppointments"
                name="maxAppointments"
                type="number"
                label="Max Appointments per Slot"
                defaultValue={selectedSetting?.max_appointments_per_slot}
                required
              />
            </div>

            <Select
              id="isActive"
              name="isActive"
              label="Status"
              defaultValue={selectedSetting?.is_active ? "true" : "false"}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowSettingModal(false)}>
                Cancel
              </Button>
              <Button type="submit" onClick={() => setShowSettingModal(false)}>
                Save Changes
              </Button>
            </div>
          </fetcher.Form>
        </Modal>
      </div>
    </Layout>
  );
}
