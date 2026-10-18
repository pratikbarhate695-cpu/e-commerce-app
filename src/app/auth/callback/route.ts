import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Only allow same-site relative paths, so `next` can't redirect users elsewhere.
function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/auth/reset-password";
  }
  return value;
}

// Used by password recovery links and by "Continue with Google".
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNext(requestUrl.searchParams.get("next"));
  const isRecovery = next.startsWith("/auth/reset-password");
  const failure = isRecovery ? "/admin/login?error=recovery" : "/login?error=google";

  // The user pressed "Cancel" at Google, or Google reported a problem.
  if (requestUrl.searchParams.get("error")) {
    return NextResponse.redirect(`${requestUrl.origin}${failure}`);
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${requestUrl.origin}${failure}`);
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
