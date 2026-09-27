import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user as the rest of the app sees them.
 * `id` is the Prisma User.id, so carts, orders and addresses keep working.
 * `role` always comes from the Prisma User row, never from anything a
 * user can edit (like Supabase user_metadata).
 */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "ADMIN";
};

export type Session = { user: SessionUser } | null;

const userSelect = { id: true, email: true, name: true, role: true } as const;

function displayName(email: string, meta: unknown): string {
  const fromMeta =
    meta && typeof meta === "object" && "name" in meta
      ? (meta as { name?: unknown }).name
      : undefined;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim().slice(0, 120);
  }
  return email.split("@")[0] || "Customer";
}

/**
 * Same shape as the old Auth.js `auth()`, so callers only change their import.
 * Cached per request, so layout + page + action share one lookup.
 */
export const auth = cache(async (): Promise<Session> => {
  const supabase = createClient();

  // getClaims() verifies the JWT signature; getSession() must not be trusted.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || !claims.email) return null;

  const supabaseId = claims.sub;
  const email = claims.email.toLowerCase();

  // Normal case: this Supabase account is already linked to a Prisma user.
  const linked = await prisma.user.findUnique({
    where: { supabaseId },
    select: userSelect,
  });
  if (linked) return { user: linked };

  // First login with this Supabase account. Link or create the Prisma user,
  // but only for a confirmed email, so nobody can claim an address they
  // don't own. (Rare path, so one extra call to Supabase is fine.)
  const { data: fresh } = await supabase.auth.getUser();
  const sbUser = fresh.user;
  if (!sbUser || sbUser.id !== supabaseId || !sbUser.email_confirmed_at) {
    return null;
  }

  // Case-insensitive: a seeded admin email may have been saved with capitals.
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existing) {
    // Already tied to a different Supabase account: refuse rather than guess.
    if (existing.supabaseId && existing.supabaseId !== supabaseId) return null;
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { supabaseId },
      select: userSelect,
    });
    return { user: updated };
  }

  // New people are always CUSTOMER. Admin is never granted from here.
  try {
    const created = await prisma.user.create({
      data: {
        email,
        supabaseId,
        name: displayName(email, sbUser.user_metadata),
        role: "CUSTOMER",
        cart: { create: {} },
      },
      select: userSelect,
    });
    return { user: created };
  } catch (err) {
    // Two requests raced to create the same user: use the winner's row.
    const winner = await prisma.user.findUnique({
      where: { supabaseId },
      select: userSelect,
    });
    if (winner) return { user: winner };
    throw err;
  }
});
