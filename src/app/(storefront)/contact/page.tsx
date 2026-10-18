import type { Metadata } from "next";
import { LegalPage } from "@/components/storefront/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Contact Us | ${SITE.name}` };

export default function ContactPage() {
  return (
    <LegalPage title="Contact Us">
      <p>
        Have a question about an order, a product or a return? Get in touch and
        we will reply as soon as we can.
      </p>
      <ul>
        <li>
          Email: <a className="underline" href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </li>
        <li>
          Phone / WhatsApp: <a className="underline" href={`tel:+91${SITE.phone}`}>{SITE.phone}</a>
        </li>
        <li>Address: {SITE.address}</li>
        <li>Support hours: Monday to Saturday, 10:00 AM to 6:00 PM IST</li>
      </ul>
      <p>
        Please include your order number and the email you used to order, so we
        can help you faster. We usually reply within 1 to 2 working days.
      </p>
    </LegalPage>
  );
}
