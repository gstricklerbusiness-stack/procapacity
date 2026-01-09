import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  STRIPE_PRICE_IDS,
  canDowngradeTo,
  PLANS,
  type PlanId,
  type BillingPeriod,
} from "@/lib/pricing";

const PLAN_ORDER: PlanId[] = ["STARTER", "GROWTH", "SCALE"];

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
        plan: true,
        billingPeriod: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        _count: {
          select: {
            teamMembers: { where: { active: true } },
            projects: { where: { active: true } },
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    if (!workspace.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found. Please subscribe first." },
        { status: 400 }
      );
    }

    const currentPlan = workspace.plan as PlanId;
    const currentIndex = PLAN_ORDER.indexOf(currentPlan);
    const newIndex = PLAN_ORDER.indexOf(plan);
    const isUpgrade = newIndex > currentIndex;
    const isDowngrade = newIndex < currentIndex;
    const isBillingPeriodChange = workspace.billingPeriod !== billingPeriod;

    // Check if downgrade is allowed (within limits)
    if (isDowngrade) {
      const { canDowngrade, reason } = canDowngradeTo(plan, {
        teamMembers: workspace._count.teamMembers,
        activeProjects: workspace._count.projects,
      });

      if (!canDowngrade) {
        return NextResponse.json({ error: reason }, { status: 400 });
      }
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

    const stripe = getStripe();

    // Retrieve current subscription
    const subscription = await stripe.subscriptions.retrieve(
      workspace.stripeSubscriptionId
    );

    if (!subscription || subscription.status === "canceled") {
      return NextResponse.json(
        { error: "Subscription not found or canceled" },
        { status: 400 }
      );
    }

    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      return NextResponse.json(
        { error: "Subscription item not found" },
        { status: 400 }
      );
    }

    // Determine proration behavior based on upgrade/downgrade
    // Upgrades: Charge the prorated difference immediately, keep original billing date
    // Downgrades: Don't charge extra, change takes effect at end of period
    let prorationBehavior: "create_prorations" | "none" | "always_invoice";
    const billingCycleAnchor: "unchanged" = "unchanged"; // Always keep original billing date

    if (isUpgrade) {
      // Upgrade: Charge prorated amount immediately using 'always_invoice'
      // This creates and pays an invoice immediately for the proration
      prorationBehavior = "always_invoice";
    } else if (isDowngrade) {
      // Downgrade: No extra charge, effective at end of billing period
      // Using 'none' means the customer continues paying the old rate until renewal
      prorationBehavior = "none";
    } else if (isBillingPeriodChange) {
      // Same plan but different billing period (monthly <-> yearly)
      // Charge immediately for period changes
      prorationBehavior = "always_invoice";
    } else {
      // No change
      return NextResponse.json({ 
        success: true, 
        message: "No changes needed" 
      });
    }

    // Update the subscription
    const updatedSubscription = await stripe.subscriptions.update(workspace.stripeSubscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: priceId,
        },
      ],
      metadata: {
        workspaceId: workspace.id,
        plan,
        billingPeriod,
      },
      proration_behavior: prorationBehavior,
      billing_cycle_anchor: billingCycleAnchor,
      payment_behavior: "error_if_incomplete", // Fail if payment doesn't go through
    });

    // For upgrades, if there's a pending invoice from the proration, pay it immediately
    if ((isUpgrade || isBillingPeriodChange) && updatedSubscription.latest_invoice) {
      const invoiceId = typeof updatedSubscription.latest_invoice === "string" 
        ? updatedSubscription.latest_invoice 
        : updatedSubscription.latest_invoice.id;
      
      try {
        const invoice = await stripe.invoices.retrieve(invoiceId);
        // Only pay if the invoice is open/draft and has a positive amount
        if (invoice.status === "open" || invoice.status === "draft") {
          if (invoice.status === "draft") {
            await stripe.invoices.finalizeInvoice(invoiceId);
          }
          await stripe.invoices.pay(invoiceId);
        }
      } catch (invoiceError) {
        console.error("Error paying proration invoice:", invoiceError);
        // Don't fail the whole operation if invoice payment fails
        // Stripe will retry automatically
      }
    }

    // Update workspace in database
    // For downgrades, we update immediately in DB but Stripe handles the actual billing change
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        plan,
        billingPeriod,
      },
    });

    const changeType = isUpgrade ? "upgraded" : isDowngrade ? "downgraded" : "updated";
    const effectiveMessage = isDowngrade 
      ? `Your plan has been ${changeType} to ${PLANS[plan].name}. The new rate will take effect at your next billing date.`
      : `Your plan has been ${changeType} to ${PLANS[plan].name}.`;

    return NextResponse.json({ 
      success: true,
      message: effectiveMessage,
      changeType,
    });
  } catch (error) {
    console.error("Change plan error:", error);
    return NextResponse.json(
      { error: "Failed to change plan" },
      { status: 500 }
    );
  }
}
