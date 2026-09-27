import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Called from src/middleware.ts (wired up in a later step).
// Refreshes the Supabase session cookies and returns the verified JWT claims
// so the caller can decide who may see which route.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Don't put code between createServerClient and getClaims().
  // getClaims() verifies the JWT signature; never trust getSession() here.
  const { data } = await supabase.auth.getClaims();

  return { response, claims: data?.claims ?? null };
}
