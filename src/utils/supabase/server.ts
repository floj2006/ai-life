import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export const createClient = async (cookieStore?: CookieStore) => {
  const store = cookieStore ?? (await cookies());
  const { url, anonKey } = requireSupabasePublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          // The setAll method can be called from a Server Component.
          // It is safe to ignore when proxy refreshes user sessions.
        }
      },
    },
  });
};

