import type { Metadata } from "next";
import { LegalPage } from "@/components/storefront/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Shipping Policy | ${SITE.name}` };

export default function ShippingPolicyPage() {
  return (
    <LegalPage title="Shipping Policy">
      <h2>Where we ship</h2>
      <p>We ship across India to serviceable pin codes. We do not ship outside India at this time.</p>

      <h2>Order processing</h2>
      <p>
        We ship an order after your online payment is successfully received and
        confirmed. We usually dispatch within 1 to 3 working days. Orders are
        not shipped on Sundays and public holidays.
      </p>

      <h2>Delivery time</h2>
      <p>
        Delivery usually takes 3 to 7 working days after dispatch, depending on
        your location. Delays can happen due to weather, strikes or courier
        issues. These are estimates, not guarantees.
      </p>

      <h2>Shipping charges</h2>
      <p>Any shipping charge is shown at checkout before you pay.</p>

      <h2>Tracking</h2>
      <p>
        When your order ships, we share the courier and tracking details by
        email or through your account&apos;s order page.
      </p>

      <h2>Wrong address or failed delivery</h2>
      <p>
        Please enter a complete and correct address and phone number. If a
        delivery fails because of a wrong address or because you could not be
        reached, the courier may return the parcel, and we may charge the
        shipping cost again to send it a second time.
      </p>

      <h2>Damaged parcels</h2>
      <p>
        Do not accept a parcel that is visibly tampered with or damaged. Record
        an unboxing video when you open it, and contact us within {SITE.returnDays} days at {SITE.email} or {SITE.phone}.
      </p>
    </LegalPage>
  );
}
