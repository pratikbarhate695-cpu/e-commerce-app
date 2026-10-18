RAZORPAY SETUP (test mode first)

1. Open .env in the project folder and add (use your own values, never share the secret):
   RAZORPAY_KEY_ID=rzp_test_...
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...   (same value as the key id)
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=...   (any long random password you make up, see step 3)
   On Netlify: Site settings > Environment variables, add the same 4 and redeploy.

2. Razorpay dashboard > Settings > Payment Capture: set to Automatic.

3. Webhook (needs the live site address):
   Dashboard > Settings > Webhooks > Add new webhook
   URL: https://YOUR-SITE/api/webhooks/razorpay
   Secret: the same value as RAZORPAY_WEBHOOK_SECRET
   Events: payment.captured, order.paid, payment.failed

4. Test: place an order, pay with a Razorpay test UPI/card (see Razorpay test card docs).
   The order should become CONFIRMED and "Paid". Admin can then ship it.

How it works
- Order is saved as "payment pending" and stock is held for 30 minutes.
- Unpaid orders after 30 minutes are cancelled automatically and stock returns.
- Paid status is set only after the server checks the payment with Razorpay (and the webhook).
- Admin cannot move an unpaid online order to confirmed/processing/shipped.
- Refunds: do the refund in the Razorpay dashboard, then mark the order REFUNDED in admin.
- Going live: replace the rzp_test keys with rzp_live keys after Razorpay approves your account.
