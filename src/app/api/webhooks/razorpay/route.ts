import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { markOrderPaid, markPaymentFailed } from "@/lib/payments";

export const dynamic = "force-dynamic";

type Entity = { id: string; order_id: string; amount: number; status: string };

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event: string; payload?: { payment?: { entity?: Entity } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id) return NextResponse.json({ ok: true });

  try {
    if (event.event === "payment.captured" || event.event === "order.paid") {
const result = await markOrderPaid(
payment.order_id,
payment.id,
payment.amount
);

if (!result.ok) {
console.error("Razorpay payment could not be processed:", payment.order_id);
return NextResponse.json(
{ error: "Payment processing failed" },
{ status: 500 }
);
}
} else if (event.event === "payment.failed") {
await markPaymentFailed(payment.order_id);
}

  } catch (err) {
    console.error("Razorpay webhook error", err);
    // 500 makes Razorpay retry later.
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
