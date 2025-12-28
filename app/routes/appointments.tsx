import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useSearchParams, useFetcher } from "@remix-run/react";
import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, AlertCircle, CheckCircle, User, Search, Loader2, Phone, Mail } from "lucide-react";
import { Layout } from "~/components/layout";
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Modal } from "~/components/ui";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { createSupabaseBrowserClient } from "~/lib/supabase.client";
import { formatDate, formatTime } from "~/lib/utils";

export const meta: MetaFunction = () => {
  return [{ title: "All Appointments - Liceo Clinic" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return redirect("/login", { headers });
  }

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

  const { data: campuses } = await adminClient
    .from("campuses")
    .select("id, name")
    .order("name");

  return json({
    profile,
    campuses: campuses || [],
  }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase } = createSupabaseServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const appointmentId = formData.get("appointmentId") as string;

  if (intent === "updateStatus") {
    const newStatus = formData.get("status") as string;
    
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", appointmentId);

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ success: true, message: `Appointment marked as ${newStatus}` });
  }

  if (intent === "delete") {
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appointmentId);

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ success: true, message: "Appointment deleted" });
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function Appointments() {
  const { profile, campuses } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher();

  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampus, setSelectedCampus] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const filter = searchParams.get("filter") || "all";

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const today = new Date().toISOString().split("T")[0];

      let query = supabase
        .from("appointments")
        .select(`*, campus:campus_id(id, name)`)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (filter === "today") {
        query = query.eq("appointment_date", today);
      } else if (filter === "upcoming") {
        query = query.gte("appointment_date", today).eq("status", "scheduled");
      } else if (filter === "past") {
        query = query.lt("appointment_date", today);
      } else if (filter === "completed") {
        query = query.eq("status", "completed");
      } else if (filter === "cancelled") {
        query = query.eq("status", "cancelled");
      }

      if (selectedCampus !== "all") {
        query = query.eq("campus_id", selectedCampus);
      }

      if (selectedDate) {
        query = query.eq("appointment_date", selectedDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching appointments:", error);
        setAppointments([]);
      } else {
        setAppointments(data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, selectedCampus, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (fetcher.state === "idle" && (fetcher.data as any)?.success) {
      fetchData();
      setShowStatusModal(false);
      setShowDetailsModal(false);
    }
  }, [fetcher.state, fetcher.data, fetchData]);

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

  const getAppointmentTypeBadge = (type: string) => {
    const bgColor = type === "physical_exam" ? "bg-blue-100 text-blue-800" : "bg-maroon-100 text-maroon-800";
    return (
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${bgColor}`}>
        {type === "physical_exam" ? "PE" : "C"}
      </span>
    );
  };

  const filteredAppointments = appointments.filter((appt) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      appt.patient_name?.toLowerCase().includes(search) ||
      appt.patient_email?.toLowerCase().includes(search) ||
      appt.patient_contact?.includes(search)
    );
  });

  const groupedAppointments = filteredAppointments.reduce((groups: any, appt) => {
    const date = appt.appointment_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appt);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedAppointments).sort();

  return (
    <Layout user={profile} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">All Appointments</h1>
          <p className="text-gray-600 mt-1">View and manage clinic appointments.</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Status Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "today", label: "Today" },
                  { value: "upcoming", label: "Upcoming" },
                  { value: "all", label: "All" },
                  { value: "completed", label: "Completed" },
                  { value: "cancelled", label: "Cancelled" },
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={filter === option.value ? "primary" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSearchParams({ filter: option.value });
                      setSelectedDate("");
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              {/* Campus Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs text-gray-500 mb-1">Campus</label>
                <select
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-maroon-500"
                >
                  <option value="all">All Campuses</option>
                  {campuses.map((campus: any) => (
                    <option key={campus.id} value={campus.id}>{campus.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="min-w-[150px]">
                <label className="block text-xs text-gray-500 mb-1">Specific Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    if (e.target.value) {
                      setSearchParams({ filter: "all" });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-maroon-500"
                />
              </div>

              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-gray-500 mb-1">Search Patient</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Name, email, or contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-maroon-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? "s" : ""}
          {selectedDate && ` for ${formatDate(selectedDate)}`}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-8 h-8 text-maroon-600 mx-auto mb-3 animate-spin" />
              <p className="text-gray-500">Loading appointments...</p>
            </CardContent>
          </Card>
        ) : filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-500">
                {filter === "today" ? "No appointments scheduled for today." : "No appointments match your filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center mb-3">
                  <div className="bg-maroon-800 text-white px-4 py-2 rounded-lg">
                    <p className="text-xs uppercase tracking-wide opacity-80">
                      {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })}
                    </p>
                    <p className="text-lg font-bold">
                      {new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="ml-4 text-sm text-gray-500">
                    {groupedAppointments[date].length} appointment{groupedAppointments[date].length !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Appointments Table */}
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campus</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {groupedAppointments[date].map((appt: any) => (
                          <tr key={appt.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center text-sm">
                                <Clock className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="font-medium">{formatTime(appt.start_time)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-maroon-100 rounded-full flex items-center justify-center mr-3">
                                  <User className="w-4 h-4 text-maroon-800" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{appt.patient_name || "Unknown"}</p>
                                  {appt.chief_complaint && (
                                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{appt.chief_complaint}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {appt.patient_contact && (
                                <div className="flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {appt.patient_contact}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {getAppointmentTypeBadge(appt.appointment_type)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {appt.campus?.name || "-"}
                            </td>
                            <td className="px-4 py-3">
                              {getStatusBadge(appt.status)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAppointment(appt);
                                    setShowDetailsModal(true);
                                  }}
                                >
                                  View
                                </Button>
                                {appt.status === "scheduled" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedAppointment(appt);
                                      setShowStatusModal(true);
                                    }}
                                  >
                                    Update
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Appointment Details"
          size="md"
        >
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="bg-maroon-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-maroon-900 text-lg">
                    {selectedAppointment.patient_name || "Patient"}
                  </p>
                  {getStatusBadge(selectedAppointment.status)}
                </div>
                <p className="text-sm text-maroon-700">
                  {formatDate(selectedAppointment.appointment_date)} at {formatTime(selectedAppointment.start_time)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Type</p>
                  <p className="font-medium">
                    {selectedAppointment.appointment_type === "physical_exam" ? "Physical Exam" : "Consultation"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Campus</p>
                  <p className="font-medium">{selectedAppointment.campus?.name || "-"}</p>
                </div>
              </div>

              {selectedAppointment.patient_email && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Email</p>
                  <p className="font-medium flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {selectedAppointment.patient_email}
                  </p>
                </div>
              )}

              {selectedAppointment.patient_contact && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Contact</p>
                  <p className="font-medium flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    {selectedAppointment.patient_contact}
                  </p>
                </div>
              )}

              {selectedAppointment.chief_complaint && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Chief Complaint</p>
                  <p className="font-medium">{selectedAppointment.chief_complaint}</p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Update Status Modal */}
        <Modal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          title="Update Appointment Status"
          size="sm"
        >
          {selectedAppointment && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Update status for <strong>{selectedAppointment.patient_name}</strong>'s appointment.
              </p>

              <div className="space-y-2">
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="updateStatus" />
                  <input type="hidden" name="appointmentId" value={selectedAppointment.id} />
                  <input type="hidden" name="status" value="completed" />
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Completed
                  </Button>
                </fetcher.Form>

                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="updateStatus" />
                  <input type="hidden" name="appointmentId" value={selectedAppointment.id} />
                  <input type="hidden" name="status" value="no_show" />
                  <Button type="submit" variant="outline" className="w-full">
                    Mark as No Show
                  </Button>
                </fetcher.Form>

                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="updateStatus" />
                  <input type="hidden" name="appointmentId" value={selectedAppointment.id} />
                  <input type="hidden" name="status" value="cancelled" />
                  <Button type="submit" variant="danger" className="w-full">
                    Cancel Appointment
                  </Button>
                </fetcher.Form>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button variant="ghost" onClick={() => setShowStatusModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
