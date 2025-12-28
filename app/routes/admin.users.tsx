import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useNavigation, useFetcher } from "@remix-run/react";
import { useState } from "react";
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Shield,
  Mail,
  Phone,
  Building,
  Calendar,
  Filter,
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
import { createSupabaseServerClient, createSupabaseAdminClient } from "~/lib/supabase.server";
import { formatDate } from "~/lib/utils";

export const meta: MetaFunction = () => {
  return [{ title: "User Management - Liceo Clinic Admin" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return redirect("/login", { headers });
  }

  const adminClient = createSupabaseAdminClient();
  
  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return redirect("/dashboard", { headers });
  }

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") || "pending";
  const search = url.searchParams.get("search") || "";

  let usersQuery = adminClient
    .from("profiles")
    .select(`
      *,
      campuses:campus_id(name),
      departments:department_id(name)
    `)
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    usersQuery = usersQuery.eq("is_verified", false);
  } else if (filter === "verified") {
    usersQuery = usersQuery.eq("is_verified", true);
  }

  if (search) {
    usersQuery = usersQuery.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }

  const { data: users } = await usersQuery;

  // Get counts
  const { count: pendingCount } = await adminClient
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_verified", false);

  const { count: verifiedCount } = await adminClient
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_verified", true);

  const { count: totalCount } = await adminClient
    .from("profiles")
    .select("*", { count: "exact", head: true });

  return json({
    profile,
    users: users || [],
    filter,
    search,
    counts: {
      pending: pendingCount || 0,
      verified: verifiedCount || 0,
      total: totalCount || 0,
    },
  }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createSupabaseAdminClient();
  
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const userId = formData.get("userId") as string;

  if (intent === "verify") {
    const { error } = await adminClient
      .from("profiles")
      .update({ is_verified: true })
      .eq("id", userId);

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ success: true, message: "User verified successfully" });
  }

  if (intent === "unverify") {
    const { error } = await adminClient
      .from("profiles")
      .update({ is_verified: false })
      .eq("id", userId);

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ success: true, message: "User unverified" });
  }

  if (intent === "updateRole") {
    const newRole = formData.get("role") as string;

    const { error } = await adminClient
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ success: true, message: "User role updated" });
  }

  if (intent === "delete") {
    // Delete from auth.users (will cascade to profiles)
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ success: true, message: "User deleted" });
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function AdminUsers() {
  const { profile, users, filter, search, counts } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const fetcher = useFetcher();

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleLogout = () => {
    fetcher.submit(null, { method: "post", action: "/logout" });
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
      admin: "danger",
      doctor: "info",
      nurse: "warning",
      employee: "default",
    };
    return <Badge variant={variants[role] || "default"}>{role}</Badge>;
  };

  return (
    <Layout user={profile} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Verify and manage user accounts.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Pending Verification</p>
                <p className="text-3xl font-bold text-yellow-800">{counts.pending}</p>
              </div>
              <XCircle className="w-12 h-12 text-yellow-400" />
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Verified Users</p>
                <p className="text-3xl font-bold text-green-800">{counts.verified}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-400" />
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Total Users</p>
                <p className="text-3xl font-bold text-blue-800">{counts.total}</p>
              </div>
              <Users className="w-12 h-12 text-blue-400" />
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <Form method="get" className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  id="search"
                  name="search"
                  type="text"
                  label="Search"
                  placeholder="Search by name or email..."
                  defaultValue={search}
                />
              </div>
              <div className="min-w-[150px]">
                <Select
                  id="filter"
                  name="filter"
                  label="Status"
                  defaultValue={filter}
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "verified", label: "Verified" },
                    { value: "all", label: "All Users" },
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

        {/* Users List */}
        {users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">
                {filter === "pending" 
                  ? "No users are pending verification." 
                  : "No users match your search criteria."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {users.map((user: any) => (
              <Card key={user.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-maroon-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-maroon-800 font-bold text-lg">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Mail className="w-3 h-3 mr-1" />
                          {user.email}
                        </div>
                        {user.contact_number && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="w-3 h-3 mr-1" />
                            {user.contact_number}
                          </div>
                        )}
                        {user.departments && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Building className="w-3 h-3 mr-1" />
                            {(user.departments as any).name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-start lg:items-center gap-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        Joined {formatDate(user.created_at)}
                      </div>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(user.role)}
                        <Badge variant={user.is_verified ? "success" : "warning"}>
                          {user.is_verified ? "Verified" : "Pending"}
                        </Badge>
                        {user.auth_provider === "google" && (
                          <Badge variant="info">Google</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!user.is_verified ? (
                        <fetcher.Form method="post">
                          <input type="hidden" name="intent" value="verify" />
                          <input type="hidden" name="userId" value={user.id} />
                          <Button type="submit" size="sm">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Verify
                          </Button>
                        </fetcher.Form>
                      ) : (
                        <fetcher.Form method="post">
                          <input type="hidden" name="intent" value="unverify" />
                          <input type="hidden" name="userId" value={user.id} />
                          <Button type="submit" variant="outline" size="sm">
                            <XCircle className="w-4 h-4 mr-1" />
                            Unverify
                          </Button>
                        </fetcher.Form>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowRoleModal(true);
                        }}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Change Role
                      </Button>

                      {user.id !== profile.id && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Change Role Modal */}
        <Modal
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
          title="Change User Role"
        >
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="updateRole" />
            <input type="hidden" name="userId" value={selectedUser?.id} />

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium">{selectedUser?.first_name} {selectedUser?.last_name}</p>
              <p className="text-sm text-gray-500">{selectedUser?.email}</p>
            </div>

            <Select
              id="role"
              name="role"
              label="New Role"
              defaultValue={selectedUser?.role}
              options={[
                { value: "employee", label: "Employee" },
                { value: "nurse", label: "Nurse" },
                { value: "doctor", label: "Doctor" },
                { value: "admin", label: "Admin" },
              ]}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowRoleModal(false)}>
                Cancel
              </Button>
              <Button type="submit" onClick={() => setShowRoleModal(false)}>
                Update Role
              </Button>
            </div>
          </fetcher.Form>
        </Modal>

        {/* Delete User Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete User"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="font-medium text-red-800">{selectedUser?.first_name} {selectedUser?.last_name}</p>
              <p className="text-sm text-red-600">{selectedUser?.email}</p>
            </div>
            <fetcher.Form method="post" className="flex justify-end space-x-3">
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="userId" value={selectedUser?.id} />
              <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" onClick={() => setShowDeleteModal(false)}>
                Delete User
              </Button>
            </fetcher.Form>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
