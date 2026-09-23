import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { CouponForm } from "@/components/admin/coupon-form";
import { Badge } from "@/components/admin/badge";
import { ToggleActiveButton } from "@/components/admin/toggle-active-button";
import { setCouponActive } from "@/lib/actions/admin/coupons";
import { formatMoney } from "@/lib/format";

export default async function CouponsPage() {
  await requireAdmin();
  const coupons = await prisma.coupon.findMany({ orderBy: { startsAt: "desc" } });

  return (
    <div>
      <AdminHeader title="Coupons" />
      <div className="grid grid-cols-1 gap-10 px-8 py-6 sm:grid-cols-2">
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink/50">
                <th className="py-2 font-normal">Code</th>
                <th className="py-2 font-normal">Value</th>
                <th className="py-2 font-normal">Used</th>
                <th className="py-2 font-normal">Status</th>
                <th className="py-2 font-normal" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-ink/5">
                  <td className="py-2">{c.code}</td>
                  <td className="py-2 text-ink/60">
                    {c.type === "PERCENT" ? `${c.value}%` : formatMoney(c.value)}
                  </td>
                  <td className="py-2 text-ink/60">
                    {c.timesUsed}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                  </td>
                  <td className="py-2">
                    <Badge tone={c.isActive ? "good" : "neutral"}>
                      {c.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <ToggleActiveButton id={c.id} isActive={c.isActive} action={setCouponActive} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {coupons.length === 0 && (
            <p className="mt-4 text-sm text-ink/50">No coupons yet.</p>
          )}
        </div>
        <div>
          <h2 className="mb-4 text-sm text-ink/60">Create a coupon</h2>
          <CouponForm />
        </div>
      </div>
    </div>
  );
}
