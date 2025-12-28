import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createSupabaseServerClient, createSupabaseAdminClient } from "~/lib/supabase.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const { supabase, headers } = createSupabaseServerClient(request);
    
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirect("/login?error=auth_failed", { headers });
    }

    if (session?.user) {
      const adminClient = createSupabaseAdminClient();
      const isAdminEmail = session.user.email === "hbusa82663@liceo.edu.ph";
      
      // Check if profile exists
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id, role, is_verified")
        .eq("id", session.user.id)
        .single();

      if (!existingProfile) {
        // Create new profile for Google user
        await adminClient.from("profiles").insert({
          id: session.user.id,
          email: session.user.email || "",
          first_name: session.user.user_metadata?.full_name?.split(" ")[0] || session.user.user_metadata?.name?.split(" ")[0] || "User",
          last_name: session.user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || session.user.user_metadata?.name?.split(" ").slice(1).join(" ") || "",
          role: isAdminEmail ? "admin" : "employee",
          is_verified: isAdminEmail,
          auth_provider: "google",
        });
      }

      return redirect("/dashboard", { headers });
    }
  }

  return redirect("/login", {});
}
