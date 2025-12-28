import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useActionData, useNavigation, useFetcher } from "@remix-run/react";
import { useState, useEffect, useCallback } from "react";
import { Users, Search, Plus, Edit2, Trash2, User, Mail, Phone, Building, Loader2 } from "lucide-react";
import { Layout } from "~/components/layout";
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select, Modal, Badge } from "~/components/ui";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { createSupabaseBrowserClient } from "~/lib/supabase.client";

export const meta: MetaFunction = () => {
  return [{ title: "Manage Users - Liceo Clinic" }];
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

  // Only allow admin, doctor, nurse to access this page
  if (!["admin", "doctor", "nurse"].includes(profile.role)) {
    return redirect("/dashboard", { headers });
  }

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
  const intent = formData.get("intent") as string;

  if (intent === "update") {
    const profileId = formData.get("profileId") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const contactNumber = formData.get("contactNumber") as string;
    const campusId = formData.get("campusId") as string;
    const departmentId = formData.get("departmentId") as string;

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        contact_number: contactNumber,
        campus_id: campusId || null,
        department_id: departmentId || null,
      })
      .eq("id", profileId);

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ success: true, message: "Profile updated successfully" });
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function UsersPage() {
  const { profile, userId } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string; success?: boolean; message?: string }>();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const isSubmitting = navigation.state === "submitting";

  // Client-side state
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch data client-side
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();

      const [usersRes, campusesRes, departmentsRes] = await Promise.all([
        supabase.from("profiles").select("*, campuses:campus_id(name), departments:department_id(name)").order("last_name"),
        supabase.from("campuses").select("*"),
        supabase.from("departments").select("*"),
      ]);

      setUsers(usersRes.data || []);
      setCampuses(campusesRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch after successful action
  useEffect(() => {
    if (actionData?.success) {
      fetchData();
      setShowEditModal(false);
    }
  }, [actionData, fetchData]);

  const handleLogout = () => {
    fetcher.submit(null, { method: "post", action: "/logout" });
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
      admin: "danger",
      doctor: "info",
      nurse: "success",
      employee: "default",
    };
    return <Badge variant={variants[role] || "default"}>{role}</Badge>;
  };

  return (
    <Layout user={profile} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-gray-600 mt-1">View and manage user profiles in the system.</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-maroon-600" />
                <span className="ml-2 text-gray-600">Loading users...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Campus</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Department</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-maroon-100 rounded-full flex items-center justify-center mr-3">
                              <User className="w-4 h-4 text-maroon-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </p>
                              {user.contact_number && (
                                <p className="text-xs text-gray-500">{user.contact_number}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{user.email}</td>
                        <td className="py-3 px-4">{getRoleBadge(user.role)}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {user.campuses?.name || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {user.departments?.name || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit User Profile"
          size="md"
        >
          {selectedUser && (
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="profileId" value={selectedUser.id} />

              {actionData?.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {actionData.error}
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Email:</strong> {selectedUser.email}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Role:</strong> {selectedUser.role}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="firstName"
                  name="firstName"
                  label="First Name"
                  defaultValue={selectedUser.first_name}
                  required
                />
                <Input
                  id="lastName"
                  name="lastName"
                  label="Last Name"
                  defaultValue={selectedUser.last_name}
                  required
                />
              </div>

              <Input
                id="contactNumber"
                name="contactNumber"
                label="Contact Number"
                defaultValue={selectedUser.contact_number || ""}
              />

              <Select
                id="campusId"
                name="campusId"
                label="Campus"
                defaultValue={selectedUser.campus_id || ""}
                options={campuses.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                placeholder="Select campus"
              />

              <Select
                id="departmentId"
                name="departmentId"
                label="Department"
                defaultValue={selectedUser.department_id || ""}
                options={departments.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
                placeholder="Select department"
              />

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Save Changes
                </Button>
              </div>
            </Form>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
