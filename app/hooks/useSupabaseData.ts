import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "~/lib/supabase.client";

type QueryResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useSupabaseQuery<T>(
  queryFn: (supabase: ReturnType<typeof createSupabaseBrowserClient>) => Promise<{ data: T | null; error: any }>,
  deps: any[] = []
): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const result = await queryFn(supabase);
      if (result.error) {
        setError(result.error.message);
      } else {
        setData(result.data);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Helper to run multiple queries in parallel
export function useSupabaseQueries<T extends Record<string, any>>(
  queries: {
    [K in keyof T]: (supabase: ReturnType<typeof createSupabaseBrowserClient>) => Promise<{ data: T[K] | null; error: any }>;
  },
  deps: any[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const keys = Object.keys(queries) as (keyof T)[];
      const results = await Promise.all(
        keys.map((key) => queries[key](supabase))
      );

      const resultData: Partial<T> = {};
      for (let i = 0; i < keys.length; i++) {
        if (results[i].error) {
          setError(results[i].error.message);
          return;
        }
        resultData[keys[i]] = results[i].data as T[keyof T];
      }
      setData(resultData as T);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
