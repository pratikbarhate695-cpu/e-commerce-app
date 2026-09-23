import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/actions/require-admin";

// Template for every future /api/admin/* handler: re-check the session
// here even though middleware already gated this path.
export async function GET() {
  try {
    const admin = await requireAdmin();
    return NextResponse.json({ ok: true, adminId: admin.id });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    throw err;
  }
}
