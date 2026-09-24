"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/validation/auth";

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; error: string };

export async function adminLogin(
  formData: FormData
): Promise<AdminLoginResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email and password." };
  }

  const { email, password } = parsed.data;

  // Verify that this account is actually an admin before creating
  // the authentication session.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    return {
      ok: false,
      error: "This account does not have admin access.",
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Invalid email or password." };
    }

    throw err;
  }

  return { ok: true };
}