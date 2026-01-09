import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { STRIPE_PRICE_IDS, type PlanId, type BillingPeriod } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only workspace owners can manage billing" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { plan, billingPeriod } = body as {
      plan: PlanId;
      billingPeriod: BillingPeriod;
    };

    // Validate plan and period
    if (!["STARTER", "GROWTH", "SCALE"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!["MONTHLY", "YEARLY"].includes(billingPeriod)) {
      return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
      select: {
        id: true,
        name: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // If already subscribed, redirect to change-plan instead
    if (workspace.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Already subscribed. Use change plan instead." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    let customerId = workspace.stripeCustomerId;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: workspace.name,
        metadata: {
          workspaceId: workspace.id,
          userId: session.user.id,
        },
      });

      customerId = customer.id;

      // Save customer ID
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Get price ID
    const priceId =
      billingPeriod === "YEARLY"
        ? STRIPE_PRICE_IDS[plan].yearly
        : STRIPE_PRICE_IDS[plan].monthly;

    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured for this plan" },
        { status: 500 }
      );
    }

    // Create checkout session for new subscription
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      metadata: {
        workspaceId: workspace.id,
        plan,
        billingPeriod,
      },
      subscription_data: {
        metadata: {
          workspaceId: workspace.id,
          plan,
          billingPeriod,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
