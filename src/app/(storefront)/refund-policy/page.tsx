import type { Metadata } from "next";
import { LegalPage } from "@/components/storefront/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Refund and Return Policy | ${SITE.name}` };

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund and Return Policy">
      <p>
        We want you to be happy with your purchase from {SITE.name}. This policy
        explains when you can return a product and how refunds work.
      </p>

      <h2>Return window</h2>
      <p>
        You can request a return or replacement within {SITE.returnDays} days of
        delivery. Requests made after {SITE.returnDays} days may not be accepted.
      </p>

      <h2>When you can return</h2>
      <ul>
        <li>The product arrived damaged, defective or not working.</li>
        <li>You received the wrong product, colour or model.</li>
        <li>Parts or accessories are missing from the box.</li>
      </ul>

      <h2>Conditions</h2>
      <ul>
        <li>The product must be unused, with original packaging, box, invoice and all accessories.</li>
        <li>For damaged or wrong items, please record an unboxing video when you open the parcel and share it with your request. It helps us approve your claim quickly.</li>
        <li>Products with signs of use, physical damage after delivery, water damage or tampering are not eligible.</li>
        <li>Software, SIM or account locks, seals and warranty stickers must not be removed or altered, unless the product is defective.</li>
        <li>Items that are hygiene-related, such as earphones and earbuds, can be returned only if they are defective or wrongly delivered.</li>
      </ul>

      <h2>How to request a return</h2>
      <ul>
        <li>Email {SITE.email} or call {SITE.phone} within {SITE.returnDays} days of delivery.</li>
        <li>Share your order number, the reason, and photos or video where needed.</li>
        <li>After we approve the request, we will tell you how to send the product back or arrange a pickup.</li>
      </ul>

      <h2>Refunds</h2>
      <ul>
        <li>Once we receive and check the returned product, we will confirm the approval or rejection by email.</li>
        <li>Approved refunds are sent to your original payment method within 5 to 7 working days. Your bank may take a few more days to show it.</li>
        <li>If a replacement is available, we can send it instead of a refund, if you prefer.</li>
        <li>Shipping charges, if any, are refunded only when the return is due to our mistake or a damaged or defective product.</li>
      </ul>

      <h2>Cancellations</h2>
      <p>
        You can cancel an order before it is shipped by contacting us. Prepaid
        orders cancelled before shipping are refunded to the original payment
        method. Once an order is shipped, it follows the return process above.
      </p>

      <h2>Warranty</h2>
      <p>
        Branded electronics carry the manufacturer&apos;s warranty. For issues
        after the {SITE.returnDays}-day return window, the brand&apos;s
        authorised service centre handles warranty repairs. We will help you
        with the invoice and details you need.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about returns? Email {SITE.email} or call {SITE.phone}.
      </p>
    </LegalPage>
  );
}
