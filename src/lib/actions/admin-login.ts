
"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema } from "@/lib/validation/auth";

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; error: string };

const BAD_LOGIN = "Invalid email or password.";
const NO_ACCESS = "This account does not have admin access.";
const UNAVAILABLE =
  "Sign-in is unavailable right now. Please try again.";

export async function adminLogin(
  formData: FormData
): Promise<AdminLoginResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Enter a valid email and password.",
    };
  }

  const supabase = await createClient();

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
    console.error(
      "adminLogin: sign-in rejected",
      signedIn.error?.code
    );
    return { ok: false, error: BAD_LOGIN };
  }

  const isMarkedAdmin =
    sbUser.app_metadata?.app_role === "admin";
    console.log("[adminLogin diagnostic] Supabase checks", {
      emailConfirmed: Boolean(sbUser.email_confirmed_at),
      appRoleIsAdmin: isMarkedAdmin,
      emailMatches:
       (sbUser.email ?? "").trim().toLowerCase() ===
       parsed.data.email.trim().toLowerCase(),
    });

  let isDbAdmin = false;

  if (sbUser.email && sbUser.email_confirmed_at) {
    try {
      const row = await prisma.user.findFirst({
        where: {
          email: {
            equals: sbUser.email,
            mode: "insensitive",
          },
        },
        select: {
          role: true,
          supabaseId: true,
        },
      });

      isDbAdmin =
        row !== null &&
        row.role === "ADMIN" &&
        (!row.supabaseId ||
         row.supabaseId === sbUser.id);
          console.log("[adminLogin diagnostic] Prisma checks", {
             userFound: Boolean(row),
             roleIsAdmin: row?.role === "ADMIN",
             supabaseIdMatches:
              row !== null && (!row.supabaseId || row.supabaseId === sbUser.id),
            });
    } catch (err) {
      console.error(
        "adminLogin: database verification failed",
        err
      );

      await supabase.auth.signOut({ scope: "local" });

      return { ok: false, error: UNAVAILABLE };
    }
  }

  if (!isMarkedAdmin || !isDbAdmin) {
    await supabase.auth.signOut({ scope: "local" });

    return {
      ok: false,
      error: NO_ACCESS,
    };
  }

  return { ok: true };
}
