import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";
import type { PlanId, BillingPeriod } from "@/lib/pricing";

// Ensure this route is not cached and runs dynamically
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return new NextResponse(JSON.stringify({ error: "Missing signature" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new NextResponse(JSON.stringify({ error: "Invalid signature" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
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
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new NextResponse(JSON.stringify({ error: "Webhook handler failed" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspaceId;
  const plan = session.metadata?.plan as PlanId;
  const billingPeriod = session.metadata?.billingPeriod as BillingPeriod;

  if (!workspaceId || !plan) {
    console.error("Missing metadata in checkout session:", { 
      workspaceId, 
      plan, 
      metadata: session.metadata 
    });
    return;
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      plan,
      billingPeriod: billingPeriod || "MONTHLY",
      stripeSubscriptionId: session.subscription as string,
      subscribedAt: new Date(),
      trialEndsAt: null, // Clear trial when subscribed
    },
  });

  console.log(`Workspace ${workspaceId} subscribed to ${plan} (${billingPeriod})`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const workspaceId = subscription.metadata?.workspaceId;

  if (!workspaceId) {
    // Try to find workspace by subscription ID
    const workspace = await prisma.workspace.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!workspace) {
      console.error("Could not find workspace for subscription:", subscription.id);
      return;
    }
  }

  // Handle plan changes from Stripe directly
  const plan = subscription.metadata?.plan as PlanId;
  const billingPeriod = subscription.metadata?.billingPeriod as BillingPeriod;

  if (plan) {
    await prisma.workspace.update({
      where: workspaceId ? { id: workspaceId } : { stripeSubscriptionId: subscription.id },
      data: {
        plan,
        ...(billingPeriod && { billingPeriod }),
      },
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const workspace = await prisma.workspace.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!workspace) {
    console.error("Could not find workspace for subscription:", subscription.id);
    return;
  }

  // Reset to trial-like state (read-only)
  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      stripeSubscriptionId: null,
      subscribedAt: null,
      trialEndsAt: new Date(), // Immediately expired
    },
  });

  console.log(`Subscription canceled for workspace ${workspace.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Get subscription ID from parent or lines
  const subscriptionId = 
    (invoice.parent as { subscription_id?: string })?.subscription_id ||
    (invoice.lines?.data[0]?.parent as { subscription_item_id?: string })?.subscription_item_id;

  if (!subscriptionId) {
    console.error("No subscription found for invoice:", invoice.id);
    return;
  }

  const workspace = await prisma.workspace.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!workspace) {
    console.error("Could not find workspace for failed payment:", subscriptionId);
    return;
  }

  // TODO: Send email notification about failed payment
  console.log(`Payment failed for workspace ${workspace.id}`);
}

