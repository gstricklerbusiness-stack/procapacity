import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  canDowngradeTo,
  PLANS,
  PLAN_ORDER,
  type PlanId,
  type BillingPeriod,
} from "@/lib/pricing";
import { calculateExtraSeats, getStripePriceIds } from "@/lib/seat-utils";
import type Stripe from "stripe";

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
        plan: true,
        billingPeriod: true,
        currentSeats: true,
        includedSeats: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        stripeBaseItemId: true,
        stripeSeatItemId: true,
        _count: {
          select: {
            teamMembers: { where: { active: true } },
            projects: { where: { active: true } },
            users: { where: { active: true } },
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
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

    // Check if downgrade is allowed (team members, projects, AND seats)
    if (isDowngrade) {
      const { canDowngrade, reason } = canDowngradeTo(plan, {
        teamMembers: workspace._count.teamMembers,
        activeProjects: workspace._count.projects,
        activeUsers: workspace._count.users,
      });

      if (!canDowngrade) {
        return NextResponse.json({ error: reason }, { status: 400 });
      }
    }

    // Determine proration behavior
    let prorationBehavior: "create_prorations" | "none" | "always_invoice";
    if (isUpgrade) {
      prorationBehavior = "always_invoice";
    } else if (isDowngrade) {
      prorationBehavior = "none";
    } else if (isBillingPeriodChange) {
      prorationBehavior = "always_invoice";
    } else {
      return NextResponse.json({
        success: true,
        message: "No changes needed",
      });
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

    // Identify existing items (handle both legacy single-item and new dual-item)
    const baseItem =
      subscription.items.data.find(
        (i) => i.id === workspace.stripeBaseItemId
      ) || subscription.items.data[0]; // fallback for legacy
    const seatItem = workspace.stripeSeatItemId
      ? subscription.items.data.find(
          (i) => i.id === workspace.stripeSeatItemId
        )
      : null;

    if (!baseItem) {
      return NextResponse.json(
        { error: "Subscription item not found" },
        { status: 400 }
      );
    }

    // Get new price IDs and calculate seat needs
    const { basePriceId, seatPriceId } = getStripePriceIds(plan, billingPeriod);
    const newPlanConfig = PLANS[plan];
    const extraSeats = calculateExtraSeats(
      workspace.currentSeats,
      newPlanConfig.seatPricing.includedSeats
    );

    // Build items array for subscription update
    const items: Stripe.SubscriptionUpdateParams.Item[] = [
      { id: baseItem.id, price: basePriceId, quantity: 1 },
    ];

    if (seatItem && extraSeats > 0) {
      // Update existing seat item
      items.push({
        id: seatItem.id,
        price: seatPriceId,
        quantity: extraSeats,
      });
    } else if (seatItem && extraSeats === 0) {
      // Remove seat item (no extra seats on new plan)
      items.push({ id: seatItem.id, deleted: true });
    } else if (!seatItem && extraSeats > 0) {
      // Add new seat item
      items.push({ price: seatPriceId, quantity: extraSeats });
    }
    // else: no seat item and no extra seats — nothing to add

    // Update the subscription
    const updatedSubscription = await stripe.subscriptions.update(
      workspace.stripeSubscriptionId,
      {
        items,
        metadata: {
          workspaceId: workspace.id,
          plan,
          billingPeriod,
          includedSeats: String(newPlanConfig.seatPricing.includedSeats),
        },
        proration_behavior: prorationBehavior,
        billing_cycle_anchor: "unchanged",
        payment_behavior: "error_if_incomplete",
      }
    );

    // For upgrades, pay any pending proration invoice
    if (
      (isUpgrade || isBillingPeriodChange) &&
      updatedSubscription.latest_invoice
    ) {
      const invoiceId =
        typeof updatedSubscription.latest_invoice === "string"
          ? updatedSubscription.latest_invoice
          : updatedSubscription.latest_invoice.id;

      try {
        const invoice = await stripe.invoices.retrieve(invoiceId);
        if (invoice.status === "open" || invoice.status === "draft") {
          if (invoice.status === "draft") {
            await stripe.invoices.finalizeInvoice(invoiceId);
          }
          await stripe.invoices.pay(invoiceId);
        }
      } catch (invoiceError) {
        console.error("Error paying proration invoice:", invoiceError);
      }
    }

    // Extract updated item IDs
    const updatedBaseItem = updatedSubscription.items.data.find(
      (i) => i.price.id === basePriceId
    );
    const updatedSeatItem = updatedSubscription.items.data.find(
      (i) => i.price.id === seatPriceId
    );

    // Update workspace in database
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        plan,
        billingPeriod,
        includedSeats: newPlanConfig.seatPricing.includedSeats,
        stripeBaseItemId: updatedBaseItem?.id ?? workspace.stripeBaseItemId,
        stripeSeatItemId: updatedSeatItem?.id ?? null,
      },
    });

    const changeType = isUpgrade
      ? "upgraded"
      : isDowngrade
        ? "downgraded"
        : "updated";
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
