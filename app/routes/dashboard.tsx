import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, FileText, Plus, User, AlertCircle, Loader2 } from "lucide-react";
import { Layout } from "~/components/layout";
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from "~/components/ui";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { createSupabaseBrowserClient } from "~/lib/supabase.client";
import { formatDate, formatTime } from "~/lib/utils";

export const meta: MetaFunction = () => {
  return [{ title: "Dashboard - Liceo Clinic Scheduling" }];
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

  // If no profile exists, create a basic one
  if (!profile) {
    const isAdminEmail = session.user.email === "hbusa82663@liceo.edu.ph";
    
    const { data: newProfile, error: createError } = await adminClient
      .from("profiles")
      .insert({
        id: session.user.id,
        email: session.user.email || "",
        first_name: session.user.user_metadata?.full_name?.split(" ")[0] || "User",
        last_name: session.user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
        role: isAdminEmail ? "admin" : "employee",
        is_verified: isAdminEmail,
        auth_provider: "google",
      })
      .select()
      .single();

    if (createError || !newProfile) {
      await supabase.auth.signOut();
      return redirect("/login?error=profile_creation_failed", { headers });
    }

    return json({
      profile: newProfile,
      userId: session.user.id,
    }, { headers });
  }

  // Only return profile - data will be fetched client-side
  return json({
    profile,
    userId: session.user.id,
  }, { headers });
}

export default function Dashboard() {
  const { profile, userId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  // Client-side data fetching state
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, upcoming: 0 });

  // Fetch data client-side - show all clinic appointments
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

      const [upcomingRes, totalRes, completedRes, upcomingCountRes] = await Promise.all([
        // Get upcoming appointments (today from now onwards + future dates)
        supabase
          .from("appointments")
          .select(`*, campus:campus_id(name)`)
          .gte("appointment_date", today)
          .eq("status", "scheduled")
          .order("appointment_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(10),
        // Total appointments count
        supabase
          .from("appointments")
          .select("*", { count: "exact", head: true }),
        // Completed appointments count
        supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed"),
        // Upcoming appointments count (scheduled, today or future)
        supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .gte("appointment_date", today)
          .eq("status", "scheduled"),
      ]);

      // Filter upcoming to only show truly upcoming (not past times today)
      const filteredUpcoming = (upcomingRes.data || []).filter((appt: any) => {
        if (appt.appointment_date > today) return true;
        // For today, only show appointments that haven't started yet
        return appt.start_time >= currentTime;
      });

      setUpcomingAppointments(filteredUpcoming.slice(0, 5));
      setStats({
        total: totalRes.count || 0,
        completed: completedRes.count || 0,
        upcoming: upcomingCountRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const getAppointmentTypeBadge = (type: string) => {
    return (
      <Badge variant={type === "physical_exam" ? "default" : "info"}>
        {type === "physical_exam" ? "Physical Exam" : "Consultation"}
      </Badge>
    );
  };

  return (
    <Layout user={profile} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {profile.first_name}!
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your clinic appointments and schedule new ones.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-maroon-800 text-white">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gold-300">Total Appointments</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="w-12 h-12 text-gold-400 opacity-80" />
            </CardContent>
          </Card>

          <Card className="bg-green-600 text-white">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-100">Completed</p>
                <p className="text-3xl font-bold">{stats.completed}</p>
              </div>
              <FileText className="w-12 h-12 text-green-200 opacity-80" />
            </CardContent>
          </Card>

          <Card className="bg-gold-500 text-maroon-900">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-maroon-700">Upcoming</p>
                <p className="text-3xl font-bold">{stats.upcoming}</p>
              </div>
              <Clock className="w-12 h-12 text-maroon-700 opacity-80" />
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Appointments</CardTitle>
              <Link to="/schedule">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-maroon-600 mx-auto mb-3 animate-spin" />
                  <p className="text-gray-500">Loading appointments...</p>
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No upcoming appointments</p>
                  <Link to="/schedule" className="text-maroon-800 font-medium hover:underline text-sm">
                    Schedule one now
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((appointment: any) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-maroon-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-maroon-800" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {appointment.patient_name || "Patient"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(appointment.appointment_date)} at {formatTime(appointment.start_time)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {appointment.campus?.name || "Campus"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {getAppointmentTypeBadge(appointment.appointment_type)}
                      </div>
                    </div>
                  ))}
                  {stats.upcoming > 5 && (
                    <Link to="/appointments" className="block text-center text-sm text-maroon-600 hover:underline py-2">
                      View all {stats.upcoming} upcoming appointments
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/schedule" className="block">
                <div className="flex items-center p-4 bg-maroon-50 rounded-lg hover:bg-maroon-100 transition-colors">
                  <div className="w-12 h-12 bg-maroon-800 rounded-lg flex items-center justify-center mr-4">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Schedule Appointment</p>
                    <p className="text-sm text-gray-500">Book a physical exam or consultation</p>
                  </div>
                </div>
              </Link>

              <Link to="/appointments" className="block">
                <div className="flex items-center p-4 bg-gold-50 rounded-lg hover:bg-gold-100 transition-colors">
                  <div className="w-12 h-12 bg-gold-500 rounded-lg flex items-center justify-center mr-4">
                    <FileText className="w-6 h-6 text-maroon-900" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">View All Appointments</p>
                    <p className="text-sm text-gray-500">See your appointment history</p>
                  </div>
                </div>
              </Link>

              <Link to="/profile" className="block">
                <div className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center mr-4">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Update Profile</p>
                    <p className="text-sm text-gray-500">Manage your personal information</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
