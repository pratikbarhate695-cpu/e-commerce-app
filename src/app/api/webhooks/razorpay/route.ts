
import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { markOrderPaid, markPaymentFailed } from "@/lib/payments";

export const dynamic = "force-dynamic";

type Entity = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
};

export async function POST(request: Request) {
  const raw = await request.text();

  if (
    !verifyWebhookSignature(
      raw,
      request.headers.get("x-razorpay-signature")
    )
  ) {
    console.warn("Razorpay webhook: signature verification failed");

    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  console.info("Razorpay webhook: signature verified");

  let event: {
    event: string;
    payload?: { payment?: { entity?: Entity } };
  };

  try {
    event = JSON.parse(raw);
  } catch {
    console.warn("Razorpay webhook: invalid JSON body");

    return NextResponse.json(
      { error: "Bad body" },
      { status: 400 }
    );
  }

  const payment = event.payload?.payment?.entity;

  if (!payment?.order_id) {
    console.info(
      "Razorpay webhook: event received without payment order"
    );
    return NextResponse.json({ ok: true });
  }

  console.info("Razorpay webhook: event received", event.event);

  try {
    if (
      event.event === "payment.captured" ||
      event.event === "order.paid"
    ) {
      if (
        !payment.id ||
        payment.currency !== "INR" ||
        !Number.isSafeInteger(payment.amount) ||
        payment.amount <= 0
      ) {
        console.error(
          "Razorpay webhook rejected: invalid payment details"
        );

        return NextResponse.json(
          { error: "Invalid payment details" },
          { status: 400 }
        );
      }

      const result = await markOrderPaid(
        payment.order_id,
        payment.id,
        payment.amount
      );

      if (!result.ok) {
        console.error(
          "Razorpay payment could not be processed"
        );

        return NextResponse.json(
          { error: "Payment processing failed" },
          { status: 500 }
        );
      }

      console.info(
        "Razorpay webhook: captured payment processed successfully"
      );
    } else if (event.event === "payment.failed") {
      await markPaymentFailed(payment.order_id);

      console.info(
        "Razorpay webhook: failed payment event processed"
      );
    } else {
      console.info(
        "Razorpay webhook: event acknowledged",
        event.event
      );
    }
  } catch (err) {
    console.error("Razorpay webhook processing error", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
