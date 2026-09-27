"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema } from "@/lib/validation/auth";

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; error: string };

const BAD_LOGIN = "Invalid email or password.";
const NO_ACCESS = "This account does not have admin access.";
const UNAVAILABLE = "Sign-in is unavailable right now. Please try again.";

export async function adminLogin(formData: FormData): Promise<AdminLoginResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email and password." };
  }

  const supabase = createClient();

  let signedIn;
  try {
    signedIn = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
  } catch (err) {
    console.error("adminLogin: Supabase request failed", err);
    return { ok: false, error: UNAVAILABLE };
  }

  const sbUser = signedIn.data.user;
  if (signedIn.error || !sbUser) {
    console.error("adminLogin: sign-in rejected", signedIn.error?.code);
    return { ok: false, error: BAD_LOGIN };
  }

  // Check the admin role from the user Supabase just returned. Don't call
  // auth() here: it reads the cookies that arrived with the request, which
  // don't include the session we just created.
  //
  // Admin needs BOTH: the marker only the project owner can set in Supabase
  // (app_metadata.app_role), and ADMIN on the matching Prisma user row.
  const isMarkedAdmin = sbUser.app_metadata?.app_role === "admin";

  let isDbAdmin = false;
  if (sbUser.email && sbUser.email_confirmed_at) {
    const row = await prisma.user.findFirst({
      where: { email: { equals: sbUser.email, mode: "insensitive" } },
      select: { role: true, supabaseId: true },
    });
    isDbAdmin =
      row?.role === "ADMIN" && (!row.supabaseId || row.supabaseId === sbUser.id);
  }

  if (!isMarkedAdmin || !isDbAdmin) {
    // Wrong door: end this session (this device only) so visiting the admin
    // URL never leaves a customer signed in from here.
    await supabase.auth.signOut({ scope: "local" });
    return { ok: false, error: NO_ACCESS };
  }

  return { ok: true };
}
