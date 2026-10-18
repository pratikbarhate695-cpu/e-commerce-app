import type { Metadata } from "next";
import { LegalPage } from "@/components/storefront/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Privacy Policy | ${SITE.name}` };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        {SITE.name} respects your privacy. This policy explains what personal
        data we collect, why we collect it, and your choices.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email address and phone number.</li>
        <li>Order details: delivery address, products ordered and order history.</li>
        <li>Payment status: whether your payment succeeded. Card, UPI and bank details are handled by Razorpay and are not stored by us.</li>
        <li>Basic technical data, such as browser type and cookies needed to keep you signed in and remember your theme choice.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To create your account and sign you in with a one-time code.</li>
        <li>To process, ship and support your orders, returns and refunds.</li>
        <li>To prevent fraud and keep the website secure.</li>
        <li>To send order updates. We do not send marketing messages unless you agree.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>We share only what is needed, with service providers who help us run the store:</p>
      <ul>
        <li>Payment gateway (Razorpay) to take and refund payments.</li>
        <li>Courier partners to deliver your order.</li>
        <li>Hosting, database, authentication and image services used to run the website.</li>
      </ul>
      <p>We do not sell your personal data. We may share data if the law requires it.</p>

      <h2>Cookies</h2>
      <p>
        We use only essential cookies and local storage, for sign-in, your cart and your light or dark theme. You can clear them in your browser.
      </p>

      <h2>How long we keep data</h2>
      <p>
        We keep order and account data as long as needed to provide our service, handle returns and meet legal and tax requirements.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask us to access, correct or delete your personal data, or to withdraw your consent, by emailing {SITE.email}. We may keep data we are legally required to keep.
      </p>

      <h2>Security</h2>
      <p>
        We use reasonable safeguards to protect your data. No website can be 100% secure, so please keep your login codes private.
      </p>

      <h2>Children</h2>
      <p>This website is not meant for children under 18 to use on their own.</p>

      <h2>Contact</h2>
      <p>
        For privacy questions, email {SITE.email} or call {SITE.phone}. {SITE.address}.
      </p>
    </LegalPage>
  );
}
