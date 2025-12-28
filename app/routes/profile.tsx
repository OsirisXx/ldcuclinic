import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useActionData, useNavigation, useFetcher } from "@remix-run/react";
import { User, Mail, Phone, Calendar, Building, GraduationCap } from "lucide-react";
import { Layout } from "~/components/layout";
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select, Badge } from "~/components/ui";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { calculateAge } from "~/lib/utils";

export const meta: MetaFunction = () => {
  return [{ title: "My Profile - Liceo Clinic" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return redirect("/login", { headers });
  }

  // Use admin client to bypass RLS for all queries (faster)
  const { createSupabaseAdminClient } = await import("~/lib/supabase.server");
  const adminClient = createSupabaseAdminClient();

  // Parallel fetch using admin client
  const [profileResult, campusesResult, departmentsResult] = await Promise.all([
    adminClient
      .from("profiles")
      .select(`
        *,
        campuses:campus_id(name),
        departments:department_id(name)
      `)
      .eq("id", session.user.id)
      .single(),
    adminClient.from("campuses").select("*"),
    adminClient.from("departments").select("*"),
  ]);

  const profile = profileResult.data;
  if (!profile) {
    return redirect("/login", { headers });
  }

  const campuses = campusesResult.data;
  const departments = departmentsResult.data;

  return json({
    profile,
    campuses: campuses || [],
    colleges: [],
    departments: departments || [],
  }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const middleName = formData.get("middleName") as string;
  const contactNumber = formData.get("contactNumber") as string;
  const dateOfBirth = formData.get("dateOfBirth") as string;
  const sex = formData.get("sex") as "male" | "female";
  const campusId = formData.get("campusId") as string;

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      middle_name: middleName || null,
      contact_number: contactNumber,
      date_of_birth: dateOfBirth || null,
      sex: sex || null,
      campus_id: campusId || null,
    })
    .eq("id", user.id);

  if (error) {
    return json({ error: error.message }, { status: 400 });
  }

  return json({ success: true, message: "Profile updated successfully" });
}

export default function Profile() {
  const { profile, campuses, colleges, departments } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string; success?: boolean; message?: string }>();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const isSubmitting = navigation.state === "submitting";

  const handleLogout = () => {
    fetcher.submit(null, { method: "post", action: "/logout" });
  };

  const age = profile?.date_of_birth ? calculateAge(profile.date_of_birth) : null;

  return (
    <Layout user={profile} onLogout={handleLogout}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">View and update your personal information.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardContent className="text-center py-8">
              <div className="w-24 h-24 bg-maroon-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-12 h-12 text-maroon-800" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h2>
              <p className="text-gray-500 capitalize">{profile.role}</p>
              <Badge variant="info" className="mt-2 capitalize">{profile.role}</Badge>

              <div className="mt-6 space-y-3 text-left">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  {profile.email}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  {profile.contact_number}
                </div>
                {age && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    {age} years old
                  </div>
                )}
                {profile.departments && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Building className="w-4 h-4 mr-2 text-gray-400" />
                    {(profile.departments as any).name}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-4">
                {actionData?.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {actionData.error}
                  </div>
                )}

                {actionData?.success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                    {actionData.message}
                  </div>
                )}

                <div className="grid md:grid-cols-3 gap-4">
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    label="First Name"
                    defaultValue={profile.first_name}
                    required
                  />
                  <Input
                    id="middleName"
                    name="middleName"
                    type="text"
                    label="Middle Name"
                    defaultValue={profile.middle_name || ""}
                  />
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    label="Last Name"
                    defaultValue={profile.last_name}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    id="contactNumber"
                    name="contactNumber"
                    type="tel"
                    label="Contact Number"
                    defaultValue={profile.contact_number}
                    required
                  />
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    label="Date of Birth"
                    defaultValue={profile.date_of_birth || ""}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Select
                    id="sex"
                    name="sex"
                    label="Sex"
                    defaultValue={profile.sex || ""}
                    options={[
                      { value: "", label: "Select sex" },
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                    ]}
                  />

                  <Select
                    id="campusId"
                    name="campusId"
                    label="Campus Assignment"
                    defaultValue={profile.campus_id || ""}
                    options={campuses.map((c: any) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    placeholder="Select campus"
                  />
                </div>

                <div className="pt-4">
                  <Button type="submit" isLoading={isSubmitting}>
                    Save Changes
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
