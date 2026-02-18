import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { PLANS, type PlanId, type BillingPeriod } from "@/lib/pricing";
import { getStripePriceIds, syncWorkspaceSeats } from "@/lib/seat-utils";

// Ensure this route is not cached and runs dynamically
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return new NextResponse(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return new NextResponse(
      JSON.stringify({ error: "Webhook secret not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new NextResponse(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new NextResponse(
      JSON.stringify({ error: "Webhook handler failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// ---------------------------------------------------------------------------
// checkout.session.completed
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspaceId;
  const plan = session.metadata?.plan as PlanId;
  const billingPeriod = session.metadata?.billingPeriod as BillingPeriod;

  if (!workspaceId || !plan) {
    console.error("Missing metadata in checkout session:", {
      workspaceId,
      plan,
      metadata: session.metadata,
    });
    return;
  }

  const stripe = getStripe();
  const subscriptionId = session.subscription as string;

  // Retrieve subscription to identify base and seat items
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Match items by price IDs
  let stripeBaseItemId: string | null = null;
  let stripeSeatItemId: string | null = null;

  try {
    const { basePriceId, seatPriceId } = getStripePriceIds(plan, billingPeriod);
    const baseItem = subscription.items.data.find(
      (i) => i.price.id === basePriceId
    );
    const seatItem = subscription.items.data.find(
      (i) => i.price.id === seatPriceId
    );
    stripeBaseItemId = baseItem?.id ?? null;
    stripeSeatItemId = seatItem?.id ?? null;

    // If checkout didn't include a seat item (extraSeats was 0 at checkout time),
    // create one now with quantity 0 so it always exists on the subscription.
    // Stripe Checkout requires quantity >= 1, but the Subscriptions API allows 0.
    if (!stripeSeatItemId) {
      const newSeatItem = await stripe.subscriptionItems.create({
        subscription: subscriptionId,
        price: seatPriceId,
        quantity: 0,
        proration_behavior: "none",
      });
      stripeSeatItemId = newSeatItem.id;
    }
  } catch (err) {
    // If price ID lookup or seat item creation fails, fall back to positional
    console.error("Error setting up subscription items:", err);
    stripeBaseItemId = stripeBaseItemId ?? subscription.items.data[0]?.id ?? null;
  }

  const planConfig = PLANS[plan];

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      plan,
      billingPeriod: billingPeriod || "MONTHLY",
      stripeSubscriptionId: subscriptionId,
      stripeBaseItemId,
      stripeSeatItemId,
      includedSeats: planConfig.seatPricing.includedSeats,
      subscribedAt: new Date(),
      trialEndsAt: null, // Clear trial when subscribed
    },
  });

  // Sync seat count (sets currentSeats, and creates/updates Stripe seat item if needed)
  await syncWorkspaceSeats(workspaceId);

  console.log(
    `Workspace ${workspaceId} subscribed to ${plan} (${billingPeriod})`
  );
}

// ---------------------------------------------------------------------------
// customer.subscription.updated
// ---------------------------------------------------------------------------

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const workspaceId = subscription.metadata?.workspaceId;

  // Find workspace by metadata or subscription ID
  const workspace = workspaceId
    ? await prisma.workspace.findUnique({ where: { id: workspaceId } })
    : await prisma.workspace.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });

  if (!workspace) {
    console.error(
      "Could not find workspace for subscription:",
      subscription.id
    );
    return;
  }

  // Update plan info from metadata
  const plan = subscription.metadata?.plan as PlanId | undefined;
  const billingPeriod = subscription.metadata?.billingPeriod as
    | BillingPeriod
    | undefined;

  // Re-identify subscription items
  let stripeBaseItemId = workspace.stripeBaseItemId;
  let stripeSeatItemId = workspace.stripeSeatItemId;

  if (plan && billingPeriod) {
    try {
      const { basePriceId, seatPriceId } = getStripePriceIds(
        plan,
        billingPeriod
      );
      const baseItem = subscription.items.data.find(
        (i) => i.price.id === basePriceId
      );
      const seatItem = subscription.items.data.find(
        (i) => i.price.id === seatPriceId
      );
      if (baseItem) stripeBaseItemId = baseItem.id;
      stripeSeatItemId = seatItem?.id ?? null;
    } catch {
      // Keep existing IDs if lookup fails
    }
  }

  const updateData: Record<string, unknown> = {
    stripeBaseItemId,
    stripeSeatItemId,
  };

  if (plan) {
    updateData.plan = plan;
    updateData.includedSeats = PLANS[plan].seatPricing.includedSeats;
  }
  if (billingPeriod) {
    updateData.billingPeriod = billingPeriod;
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: updateData,
  });
}

// ---------------------------------------------------------------------------
// customer.subscription.deleted
// ---------------------------------------------------------------------------

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const workspace = await prisma.workspace.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!workspace) {
    console.error(
      "Could not find workspace for subscription:",
      subscription.id
    );
    return;
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      stripeSubscriptionId: null,
      stripeBaseItemId: null,
      stripeSeatItemId: null,
      subscribedAt: null,
      trialEndsAt: new Date(), // Immediately expired → read-only
    },
  });

  console.log(`Subscription canceled for workspace ${workspace.id}`);
}

// ---------------------------------------------------------------------------
// invoice.payment_failed
// ---------------------------------------------------------------------------

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId =
    (invoice.parent as { subscription_id?: string })?.subscription_id ||
    (
      invoice.lines?.data[0]?.parent as {
        subscription_item_id?: string;
      }
    )?.subscription_item_id;

  if (!subscriptionId) {
    console.error("No subscription found for invoice:", invoice.id);
    return;
  }

  const workspace = await prisma.workspace.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!workspace) {
    console.error(
      "Could not find workspace for failed payment:",
      subscriptionId
    );
    return;
  }

  // TODO: Send email notification about failed payment
  console.log(`Payment failed for workspace ${workspace.id}`);
}
