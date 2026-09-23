"use server";

import { AuthError } from "next-auth";
import { signIn, signOut, auth } from "@/lib/auth";
import { credentialsSchema } from "@/lib/validation/auth";

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; error: string };

export async function adminLogin(formData: FormData): Promise<AdminLoginResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email and password." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Invalid email or password." };
    }
    throw err;
  }

  // Credentials matched some user — but /admin/login only accepts ADMIN.
  // Visiting the wrong URL should never cross-authenticate a customer.
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    await signOut({ redirect: false });
    return { ok: false, error: "This account does not have admin access." };
  }

  return { ok: true };
}
