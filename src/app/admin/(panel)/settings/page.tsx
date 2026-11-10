import { getStoreSettings } from "@/lib/catalog";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getStoreSettings();

  const serializableSettings = {
    storeName: settings.storeName,
    email: settings.email,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    address: settings.address,
    currency: settings.currency,
    taxPercent: settings.taxPercent.toString(),
    shippingFee: settings.shippingFee.toString(),
    freeShippingThreshold: settings.freeShippingThreshold?.toString() ?? "",
  };

  return (
    <div>
      <AdminHeader title="Store settings" />
      <div className="px-8 py-6">
        <SettingsForm settings={serializableSettings} />
      </div>
    </div>
  );
}
