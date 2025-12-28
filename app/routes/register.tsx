import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useState, useMemo } from "react";
import { Check, X } from "lucide-react";
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui";
import { createSupabaseServerClient, createSupabaseAdminClient } from "~/lib/supabase.server";

export const meta: MetaFunction = () => {
  return [{ title: "Register - Liceo Clinic Scheduling" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return redirect("/dashboard", { headers });
  }

  const adminClient = createSupabaseAdminClient();
  
  const [campusesResult, departmentsResult] = await Promise.all([
    adminClient.from("campuses").select("*").order("name"),
    adminClient.from("departments").select("*").order("name"),
  ]);

  return json({
    campuses: campusesResult.data || [],
    departments: departmentsResult.data || [],
  }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const middleName = formData.get("middleName") as string;
  const dateOfBirth = formData.get("dateOfBirth") as string;
  const sex = formData.get("sex") as "male" | "female";
  const contactNumber = formData.get("contactNumber") as string;
  const campusId = formData.get("campusId") as string;
  const departmentId = formData.get("departmentId") as string;

  if (password !== confirmPassword) {
    return json({ error: "Passwords do not match" }, { status: 400 });
  }

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasMinLength || !hasNumber || !hasSpecialChar) {
    return json({ error: "Password must be at least 8 characters with 1 number and 1 special character" }, { status: 400 });
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return json({ error: authError.message }, { status: 400 });
  }

  if (!authData.user) {
    return json({ error: "Failed to create user" }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();
  const { error: profileError } = await adminClient.from("profiles").insert({
    id: authData.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    middle_name: middleName || null,
    date_of_birth: dateOfBirth || null,
    sex: sex || null,
    contact_number: contactNumber || null,
    role: "employee",
    campus_id: campusId || null,
    department_id: departmentId || null,
    is_verified: false,
    auth_provider: "email",
  });

  if (profileError) {
    return json({ error: profileError.message }, { status: 400 });
  }

  // Don't redirect to dashboard - show pending verification message
  return json({ success: true, message: "Registration successful! Please wait for admin verification before you can log in." });
}

export default function Register() {
  const { campuses, departments } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string; success?: boolean; message?: string }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [selectedCampus, setSelectedCampus] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const filteredDepartments = (departments || []).filter((d: any) => d?.campus_id === selectedCampus);

  // Real-time password validation
  const passwordValidation = useMemo(() => {
    return {
      hasMinLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      passwordsMatch: password === confirmPassword && password.length > 0,
    };
  }, [password, confirmPassword]);

  const isPasswordValid = passwordValidation.hasMinLength && 
    passwordValidation.hasNumber && 
    passwordValidation.hasSpecialChar;

  const ValidationItem = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className={`flex items-center text-sm ${valid ? "text-green-600" : "text-gray-500"}`}>
      {valid ? <Check className="w-4 h-4 mr-2" /> : <X className="w-4 h-4 mr-2 text-red-400" />}
      {text}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-maroon-800 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center">
              <span className="text-maroon-900 font-bold text-lg">L</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Liceo Clinic</h1>
              <p className="text-xs text-gold-300">Scheduling System</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Register to start scheduling your clinic appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              {actionData?.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {actionData.error}
                </div>
              )}

              {actionData?.success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  <p className="font-medium">{actionData.message}</p>
                  <p className="text-sm mt-2">
                    <Link to="/login" className="underline font-medium">Go to login page</Link>
                  </p>
                </div>
              )}

              {!actionData?.success && (
              <>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Account Information</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    label="Email Address"
                    placeholder="you@liceo.edu.ph"
                    required
                  />
                  <Input
                    id="contactNumber"
                    name="contactNumber"
                    type="tel"
                    label="Contact Number"
                    placeholder="09XX XXX XXXX"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        label="Password"
                        placeholder="At least 8 characters"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        label="Confirm Password"
                        placeholder="Confirm your password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {password.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                      <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
                      <ValidationItem valid={passwordValidation.hasMinLength} text="At least 8 characters" />
                      <ValidationItem valid={passwordValidation.hasNumber} text="At least 1 number" />
                      <ValidationItem valid={passwordValidation.hasSpecialChar} text="At least 1 special character (!@#$%^&*)" />
                      {confirmPassword.length > 0 && (
                        <ValidationItem valid={passwordValidation.passwordsMatch} text="Passwords match" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    label="First Name"
                    placeholder="Juan"
                    required
                  />
                  <Input
                    id="middleName"
                    name="middleName"
                    type="text"
                    label="Middle Name"
                    placeholder="Dela"
                  />
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    label="Last Name"
                    placeholder="Cruz"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    label="Date of Birth"
                  />
                  <Select
                    id="sex"
                    name="sex"
                    label="Sex"
                    placeholder="Select sex"
                    options={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Affiliation</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <Select
                    id="campusId"
                    name="campusId"
                    label="Campus"
                    required
                    value={selectedCampus}
                    onChange={(e) => setSelectedCampus(e.target.value)}
                    placeholder="Select campus"
                    options={(campuses || []).map((c: any) => ({ value: c.id, label: c.name }))}
                  />
                  <Select
                    id="departmentId"
                    name="departmentId"
                    label="Department"
                    required
                    placeholder="Select department"
                    options={filteredDepartments.map((d: any) => ({ value: d.id, label: d.name }))}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                isLoading={isSubmitting}
                disabled={!isPasswordValid || !passwordValidation.passwordsMatch}
              >
                Create Account
              </Button>
              </>
              )}
            </Form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-maroon-800 font-medium hover:underline">
                Sign in here
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-maroon-800 text-white py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Liceo de Cagayan University</p>
        </div>
      </footer>
    </div>
  );
}
