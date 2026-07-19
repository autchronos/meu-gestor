import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Next 14: cookies() é síncrono.
export function criarClienteServidor() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Em Server Components a escrita de cookie lança; ignoramos porque o
          // middleware já renova a sessão. Em actions/route handlers funciona.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // no-op
          }
        },
      },
    },
  );
}
