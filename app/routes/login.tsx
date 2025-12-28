import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui";
import { createSupabaseServerClient, createSupabaseAdminClient } from "~/lib/supabase.server";

export const meta: MetaFunction = () => {
  return [{ title: "Login - Liceo Clinic Scheduling" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  
  const url = new URL(request.url);
  const pendingParam = url.searchParams.get("pending") === "true";
  const errorParam = url.searchParams.get("error");
  
  // If we have pending or error params, just show the login page
  if (pendingParam || errorParam) {
    return json({ pendingVerification: pendingParam, error: errorParam }, { headers });
  }
  
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // For now, allow all authenticated users through
    // Verification will be checked once migration is run
    return redirect("/dashboard", { headers });
  }

  return json({ pendingVerification: false }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // Handle Google OAuth
  if (intent === "google") {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${new URL(request.url).origin}/auth/callback`,
      },
    });

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    if (data.url) {
      return redirect(data.url, { headers });
    }

    return json({ error: "Failed to initiate Google login" }, { status: 400 });
  }

  // Handle email/password login
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return json({ error: "Email and password are required" }, { status: 400 });
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return json({ error: error.message }, { status: 400 });
  }

  // Check if user is verified
  if (authData.user) {
    const adminClient = createSupabaseAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("is_verified, role")
      .eq("id", authData.user.id)
      .single();

    if (profile && !profile.is_verified && profile.role !== 'admin') {
      await supabase.auth.signOut();
      return json({ 
        error: "Your account is pending verification. Please wait for an admin to approve your account." 
      }, { status: 403, headers });
    }
  }

  return redirect("/dashboard", { headers });
}

export default function Login() {
  const actionData = useActionData<{ error?: string; pendingVerification?: boolean }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

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
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {actionData?.pendingVerification && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm mb-4">
                <p className="font-medium">Account Pending Verification</p>
                <p className="mt-1">Your account is awaiting admin approval. Please check back later.</p>
              </div>
            )}

            <Form method="post" className="space-y-4">
              {actionData?.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {actionData.error}
                </div>
              )}

              <Input
                id="email"
                name="email"
                type="email"
                label="Email Address"
                placeholder="you@liceo.edu.ph"
                required
                autoComplete="email"
              />

              <Input
                id="password"
                name="password"
                type="password"
                label="Password"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />

              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Sign In
              </Button>
            </Form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <Form method="post">
              <input type="hidden" name="intent" value="google" />
              <Button 
                type="submit" 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2"
                isLoading={isSubmitting}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </Button>
            </Form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/register" className="text-maroon-800 font-medium hover:underline">
                Register here
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
