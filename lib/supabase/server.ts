// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { Database } from "../types/database.types";
import { SUPABASE_OPTIONS, SUPABASE_SCHEMA } from "./constants";
import { getActiveSupabaseConfig } from "./env";

/**
 * Cliente dinámico con cookies.
 * Úsalo SOLO en páginas, layouts, server actions o route handlers que dependan de sesión/auth.
 *
 * Las rutas que usen este cliente deben ser dinámicas:
 * export const dynamic = "force-dynamic";
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = getActiveSupabaseConfig();

  return createServerClient<Database, typeof SUPABASE_SCHEMA>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Puede ocurrir si setAll se llama desde un Server Component.
            // Se puede ignorar si tienes middleware refrescando sesiones.
          }
        },
      },
      ...SUPABASE_OPTIONS,
    }
  );
}

/**
 * Cliente estático.
 * No usa cookies(), no usa @supabase/ssr.
 * Úsalo para datos públicos/cacheables que NO dependan del usuario.
 */
export function createStaticClient() {
  const { supabaseUrl, supabaseAnonKey } = getActiveSupabaseConfig();

  return createSupabaseClient<Database, typeof SUPABASE_SCHEMA>(
    supabaseUrl,
    supabaseAnonKey,
    SUPABASE_OPTIONS
  );
}
