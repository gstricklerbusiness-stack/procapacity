import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { PLANS, PLAN_ORDER, type PlanId, type BillingPeriod } from "@/lib/pricing";
import {
  getCurrentSeats,
  calculateExtraSeats,
  getStripePriceIds,
} from "@/lib/seat-utils";

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
    if (!PLAN_ORDER.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!["MONTHLY", "YEARLY"].includes(billingPeriod)) {
      return NextResponse.json(
        { error: "Invalid billing period" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
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
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: workspace.name,
        metadata: {
          workspaceId: workspace.id,
          userId: session.user.id,
        },
      });

      customerId = customer.id;

      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Get Stripe price IDs for base + seat
    const { basePriceId, seatPriceId } = getStripePriceIds(plan, billingPeriod);
    const planConfig = PLANS[plan];
    const currentSeats = await getCurrentSeats(workspace.id);
    const extraSeats = calculateExtraSeats(
      currentSeats,
      planConfig.seatPricing.includedSeats
    );

    // Build line items: always include base, include seat item if extra > 0.
    // Note: Stripe Checkout requires quantity >= 1, so we can't send a seat
    // item with quantity 0 here. The webhook (handleCheckoutCompleted) will
    // create a seat subscription item with quantity 0 after checkout if needed,
    // ensuring the subscription always has both items for future seat updates.
    const line_items: Array<{ price: string; quantity: number }> = [
      { price: basePriceId, quantity: 1 },
    ];

    if (extraSeats > 0) {
      line_items.push({ price: seatPriceId, quantity: extraSeats });
    }

    console.log(
      `[Checkout] plan=${plan} period=${billingPeriod} seats=${currentSeats} included=${planConfig.seatPricing.includedSeats} extra=${extraSeats} lineItems=${line_items.length}`
    );

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      metadata: {
        workspaceId: workspace.id,
        plan,
        billingPeriod,
        includedSeats: String(planConfig.seatPricing.includedSeats),
        currentSeats: String(currentSeats),
      },
      subscription_data: {
        metadata: {
          workspaceId: workspace.id,
          plan,
          billingPeriod,
          includedSeats: String(planConfig.seatPricing.includedSeats),
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
