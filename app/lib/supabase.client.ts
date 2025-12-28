import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "~/types/database.types";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    window.ENV.SUPABASE_URL,
    window.ENV.SUPABASE_ANON_KEY
  );
}

declare global {
  interface Window {
    ENV: {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    };
  }
}
