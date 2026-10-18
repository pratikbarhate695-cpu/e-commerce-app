import type { Metadata } from "next";
import { LegalPage } from "@/components/storefront/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Terms and Conditions | ${SITE.name}` };

export default function TermsPage() {
  return (
    <LegalPage title="Terms and Conditions">
      <p>
        By using this website and placing an order, you agree to these terms.
        The website is operated by {SITE.name}, {SITE.address}. Please read them
        before you buy.
      </p>

      <h2>Using the website</h2>
      <ul>
        <li>You must be 18 or older, or use the site under a parent or guardian.</li>
        <li>Give correct name, phone, email and address details when you order.</li>
        <li>You are responsible for keeping your account and login codes safe.</li>
        <li>You agree not to misuse the site, try to break its security, or place false or fraudulent orders.</li>
      </ul>

      <h2>Products and prices</h2>
      <ul>
        <li>All prices are in Indian Rupees (INR) and include applicable taxes unless stated otherwise.</li>
        <li>We try to keep product details, images and prices correct, but mistakes can happen. Product colours may look slightly different on your screen.</li>
        <li>We may change prices or stock at any time. If an order is affected by a pricing or stock error, we may cancel it and refund you in full.</li>
      </ul>

      <h2>Orders and payment</h2>
      <ul>
        <li>An order is confirmed only after your online payment is successful. We do not offer Cash on Delivery.</li>
        <li>Payments are processed by our payment partner, Razorpay, using UPI, cards, net banking and wallets. We do not see or store your card or bank details.</li>
        <li>We may cancel or refuse an order if we suspect fraud, if there is a payment problem, or if the product cannot be supplied. In that case, any amount paid is refunded.</li>
      </ul>

      <h2>Shipping, returns and refunds</h2>
      <p>
        Delivery is covered by our Shipping Policy, and returns and refunds by
        our Refund and Return Policy. Both are part of these terms.
      </p>

      <h2>Warranty</h2>
      <p>
        Branded products carry the manufacturer&apos;s warranty, which is
        handled by the brand&apos;s authorised service centre. Please confirm the
        exact model and warranty details on the invoice.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The content of this site, including text, design and our own images, belongs to {SITE.name}. Brand names and logos belong to their respective owners. You may not copy or reuse our content without permission.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent allowed by law, {SITE.name} is not liable for indirect or
        consequential losses arising from using this site or our products. Our
        total liability for any order is limited to the amount you paid for that order.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of India. Any dispute will be subject to the courts at Nashik, Maharashtra.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms from time to time. The latest version is always on this page.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email {SITE.email} or call {SITE.phone}.
      </p>
    </LegalPage>
  );
}
