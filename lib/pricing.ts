// ProCapacity Pricing Configuration — Seat-Based Pricing

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanId = "STARTER" | "GROWTH" | "SCALE" | "ENTERPRISE";
export type BillingPeriod = "MONTHLY" | "YEARLY";

export interface SeatPricing {
  baseMonthly: number;
  baseYearly: number;
  includedSeats: number;
  perSeatMonthly: number;
  perSeatYearly: number;
  maxSeats: number;
}

export interface PlanLimits {
  teamMembers: number;
  activeProjects: number;
  ownerUsers: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  bestFor: string;
  seatPricing: SeatPricing;
  limits: PlanLimits;
  features: string[];
  highlighted?: boolean;
  nextPlanUpgrade: PlanId | null;
}

export interface PlanFeature {
  name: string;
  starter: string | boolean;
  growth: string | boolean;
  scale: string | boolean;
  enterprise: string | boolean;
}

// ---------------------------------------------------------------------------
// Plan order (for iteration, comparison, and validation)
// ---------------------------------------------------------------------------

export const PLAN_ORDER: PlanId[] = ["STARTER", "GROWTH", "SCALE", "ENTERPRISE"];

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

export const PLANS: Record<PlanId, Plan> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    description: "For small agencies getting started with capacity planning",
    bestFor: "Small agencies (5-10 people)",
    seatPricing: {
      baseMonthly: 149,
      baseYearly: 1490,
      includedSeats: 10,
      perSeatMonthly: 15,
      perSeatYearly: 150,
      maxSeats: 20,
    },
    limits: {
      teamMembers: 10,
      activeProjects: 25,
      ownerUsers: 1,
    },
    features: [
      "10 seats included, $15/mo per extra seat",
      "Up to 20 seats max",
      "Up to 25 active projects/retainers",
      "Team management (roles, skills, capacity)",
      "Capacity calendar with color-coded view",
      "Over-allocation warnings",
      "Who's Free search",
      "Weekly utilization report + CSV export",
      "Email support (2-business-day response)",
    ],
    nextPlanUpgrade: "GROWTH",
  },
  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    description: "For growing agencies with multiple teams",
    bestFor: "Growing agencies (10-30 people)",
    seatPricing: {
      baseMonthly: 299,
      baseYearly: 2990,
      includedSeats: 30,
      perSeatMonthly: 12,
      perSeatYearly: 120,
      maxSeats: 60,
    },
    limits: {
      teamMembers: 30,
      activeProjects: 75,
      ownerUsers: 3,
    },
    features: [
      "30 seats included, $12/mo per extra seat",
      "Up to 60 seats max",
      "Up to 75 active projects/retainers",
      "Everything in Starter, plus:",
      "Role & department filters",
      "Advanced report filters",
      "Priority email support (next-business-day)",
      "Early access to integrations",
      "Optional 30-min onboarding call",
    ],
    highlighted: true,
    nextPlanUpgrade: "SCALE",
  },
  SCALE: {
    id: "SCALE",
    name: "Scale",
    description: "For larger agencies who rely on capacity data",
    bestFor: "Large agencies (30-60 people)",
    seatPricing: {
      baseMonthly: 499,
      baseYearly: 4990,
      includedSeats: 60,
      perSeatMonthly: 10,
      perSeatYearly: 100,
      maxSeats: 100,
    },
    limits: {
      teamMembers: 60,
      activeProjects: 150,
      ownerUsers: 5,
    },
    features: [
      "60 seats included, $10/mo per extra seat",
      "Up to 100 seats max",
      "Up to 150 active projects/retainers",
      "Everything in Growth, plus:",
      "Priority support (same-day weekdays)",
      "Dedicated onboarding setup",
      "Extended data retention (12-18 months)",
      "Custom integration requests",
      "5 owner/admin users",
    ],
    nextPlanUpgrade: "ENTERPRISE",
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    description: "For large multi-discipline agencies at scale",
    bestFor: "Enterprise agencies (60-200 people)",
    seatPricing: {
      baseMonthly: 999,
      baseYearly: 9990,
      includedSeats: 100,
      perSeatMonthly: 8,
      perSeatYearly: 80,
      maxSeats: 200,
    },
    limits: {
      teamMembers: 200,
      activeProjects: 500,
      ownerUsers: 10,
    },
    features: [
      "100 seats included, $8/mo per extra seat",
      "Up to 200 seats max",
      "Up to 500 active projects/retainers",
      "Everything in Scale, plus:",
      "Dedicated account manager",
      "Custom SLA & uptime guarantees",
      "SSO / SAML (coming soon)",
      "Audit log (coming soon)",
      "10 owner/admin users",
    ],
    nextPlanUpgrade: null,
  },
};

// ---------------------------------------------------------------------------
// Stripe price IDs
// Env var pattern: STRIPE_{PLAN}_{TYPE}_{PERIOD}_PRICE_ID
// ---------------------------------------------------------------------------

export const STRIPE_PRICE_IDS: Record<
  PlanId,
  { base: { monthly: string; yearly: string }; seat: { monthly: string; yearly: string } }
> = {
  STARTER: {
    base: {
      monthly: process.env.STRIPE_STARTER_BASE_MONTHLY_PRICE_ID || "",
      yearly: process.env.STRIPE_STARTER_BASE_YEARLY_PRICE_ID || "",
    },
    seat: {
      monthly: process.env.STRIPE_STARTER_SEAT_MONTHLY_PRICE_ID || "",
      yearly: process.env.STRIPE_STARTER_SEAT_YEARLY_PRICE_ID || "",
    },
  },
  GROWTH: {
    base: {
      monthly: process.env.STRIPE_GROWTH_BASE_MONTHLY_PRICE_ID || "",
      yearly: process.env.STRIPE_GROWTH_BASE_YEARLY_PRICE_ID || "",
    },
    seat: {
      monthly: process.env.STRIPE_GROWTH_SEAT_MONTHLY_PRICE_ID || "",
      yearly: process.env.STRIPE_GROWTH_SEAT_YEARLY_PRICE_ID || "",
    },
  },
  SCALE: {
    base: {
      monthly: process.env.STRIPE_SCALE_BASE_MONTHLY_PRICE_ID || "",
      yearly: process.env.STRIPE_SCALE_BASE_YEARLY_PRICE_ID || "",
    },
    seat: {
      monthly: process.env.STRIPE_SCALE_SEAT_MONTHLY_PRICE_ID || "",
      yearly: process.env.STRIPE_SCALE_SEAT_YEARLY_PRICE_ID || "",
    },
  },
  ENTERPRISE: {
    base: {
      monthly: process.env.STRIPE_ENTERPRISE_BASE_MONTHLY_PRICE_ID || "",
      yearly: process.env.STRIPE_ENTERPRISE_BASE_YEARLY_PRICE_ID || "",
    },
    seat: {
      monthly: process.env.STRIPE_ENTERPRISE_SEAT_MONTHLY_PRICE_ID || "",
      yearly: process.env.STRIPE_ENTERPRISE_SEAT_YEARLY_PRICE_ID || "",
    },
  },
};

// ---------------------------------------------------------------------------
// Feature comparison (for pricing page table)
// ---------------------------------------------------------------------------

export const FEATURE_COMPARISON: PlanFeature[] = [
  {
    name: "Included seats",
    starter: "10",
    growth: "30",
    scale: "60",
    enterprise: "100",
  },
  {
    name: "Max seats",
    starter: "20",
    growth: "60",
    scale: "100",
    enterprise: "200",
  },
  {
    name: "Active projects/retainers",
    starter: "Up to 25",
    growth: "Up to 75",
    scale: "Up to 150",
    enterprise: "Up to 500",
  },
  {
    name: "Team members",
    starter: "Up to 10",
    growth: "Up to 30",
    scale: "Up to 60",
    enterprise: "Up to 200",
  },
  {
    name: "Owner/admin users",
    starter: "1",
    growth: "3",
    scale: "5",
    enterprise: "10",
  },
  {
    name: "Capacity calendar",
    starter: true,
    growth: true,
    scale: true,
    enterprise: true,
  },
  {
    name: "Over-allocation warnings",
    starter: true,
    growth: true,
    scale: true,
    enterprise: true,
  },
  {
    name: "Who's Free search",
    starter: true,
    growth: true,
    scale: true,
    enterprise: true,
  },
  {
    name: "Utilization reports + CSV",
    starter: true,
    growth: true,
    scale: true,
    enterprise: true,
  },
  {
    name: "Role & department filters",
    starter: false,
    growth: true,
    scale: true,
    enterprise: true,
  },
  {
    name: "Advanced report filters",
    starter: false,
    growth: true,
    scale: true,
    enterprise: true,
  },
  {
    name: "Integrations (Google Cal, Slack)",
    starter: false,
    growth: "Early access",
    scale: true,
    enterprise: true,
  },
  {
    name: "Data retention",
    starter: "6 months",
    growth: "12 months",
    scale: "18 months",
    enterprise: "24 months",
  },
  {
    name: "Support response time",
    starter: "2 business days",
    growth: "Next business day",
    scale: "Same day (weekdays)",
    enterprise: "Dedicated account manager",
  },
  {
    name: "Onboarding",
    starter: "Self-service",
    growth: "30-min call",
    scale: "Dedicated setup",
    enterprise: "Custom onboarding",
  },
  {
    name: "SSO / SAML",
    starter: false,
    growth: false,
    scale: false,
    enterprise: "Coming soon",
  },
  {
    name: "Audit log",
    starter: false,
    growth: false,
    scale: false,
    enterprise: "Coming soon",
  },
];

// ---------------------------------------------------------------------------
// FAQ items
// ---------------------------------------------------------------------------

export const PRICING_FAQ = [
  {
    question: "Do I need a credit card for the free trial?",
    answer:
      "No, you can start your 14-day free trial without entering payment information. You'll only need to add a card when you choose a plan to continue after the trial.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Yes! You can upgrade at any time and the change takes effect immediately. Downgrades take effect at your next billing cycle, as long as you're within the lower plan's limits.",
  },
  {
    question: "What counts as a team member?",
    answer:
      "Team members are people you schedule work for: strategists, designers, developers, account managers, etc. Clients are not counted. You're only billed for active team members—archived members are free.",
  },
  {
    question: "What's the difference between seats and team members?",
    answer:
      "Seats are login accounts that can access ProCapacity (billable). Team members are capacity-planning entities you schedule work for—they don't need a login. Contractors or future hires can be team members without using a seat.",
  },
  {
    question: "Do clients or contractors count as team members?",
    answer:
      "Clients do not count as team members. Contractors count only if you're scheduling capacity for them. If a contractor manages their own schedule, they don't need to be in ProCapacity.",
  },
  {
    question: "What happens when my trial ends?",
    answer:
      "If you haven't selected a plan, your workspace becomes read-only. You can still view your capacity data, but you won't be able to make changes until you subscribe.",
  },
  {
    question: "Is there a plan for larger agencies (200+ people)?",
    answer:
      "Yes! Contact us for custom pricing if you have more than 200 team members. We'll work with you to create a plan that fits your needs.",
  },
];

// ---------------------------------------------------------------------------
// Trial configuration
// ---------------------------------------------------------------------------

export const TRIAL_DAYS = 14;
export const DEFAULT_TRIAL_PLAN: PlanId = "GROWTH";

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Validate that all required Stripe price IDs are configured.
 * Returns the list of missing env var names.
 */
export function validateStripePriceIds(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const planId of PLAN_ORDER) {
    const ids = STRIPE_PRICE_IDS[planId];
    if (!ids.base.monthly) missing.push(`STRIPE_${planId}_BASE_MONTHLY_PRICE_ID`);
    if (!ids.base.yearly) missing.push(`STRIPE_${planId}_BASE_YEARLY_PRICE_ID`);
    if (!ids.seat.monthly) missing.push(`STRIPE_${planId}_SEAT_MONTHLY_PRICE_ID`);
    if (!ids.seat.yearly) missing.push(`STRIPE_${planId}_SEAT_YEARLY_PRICE_ID`);
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Get the Stripe price IDs for a plan + billing period.
 */
export function getStripePriceIds(
  plan: PlanId,
  period: BillingPeriod
): { basePriceId: string; seatPriceId: string } {
  const ids = STRIPE_PRICE_IDS[plan];
  const key = period === "YEARLY" ? "yearly" : "monthly";
  return {
    basePriceId: ids.base[key],
    seatPriceId: ids.seat[key],
  };
}

/**
 * Get the base subscription price for a plan + billing period.
 */
export function getBasePrice(plan: PlanId, period: BillingPeriod): number {
  const sp = PLANS[plan].seatPricing;
  return period === "YEARLY" ? sp.baseYearly : sp.baseMonthly;
}

/**
 * Get the per-seat price for a plan + billing period.
 */
export function getPerSeatPrice(plan: PlanId, period: BillingPeriod): number {
  const sp = PLANS[plan].seatPricing;
  return period === "YEARLY" ? sp.perSeatYearly : sp.perSeatMonthly;
}

/**
 * Get the plan object for a given plan ID.
 */
export function getPlan(planId: PlanId): Plan {
  return PLANS[planId];
}

/**
 * Get the limits for a given plan.
 */
export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLANS[planId].limits;
}

/**
 * Get the base price for a plan (convenience wrapper matching old `getPlanPrice`).
 */
export function getPlanPrice(planId: PlanId, period: BillingPeriod): number {
  return getBasePrice(planId, period);
}

/**
 * Get the next plan to upgrade to from the current plan.
 * Returns null if already on the highest tier.
 */
export function getNextPlan(currentPlan: PlanId): PlanId | null {
  return PLANS[currentPlan].nextPlanUpgrade;
}

/**
 * Format a dollar amount for display.
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate yearly savings (vs paying monthly) for the base subscription price.
 */
export function getYearlySavings(planId: PlanId): number {
  const sp = PLANS[planId].seatPricing;
  return sp.baseMonthly * 12 - sp.baseYearly;
}

/**
 * Check if given counts are within a plan's limits.
 */
export function isWithinPlanLimits(
  planId: PlanId,
  counts: { teamMembers: number; activeProjects: number }
): boolean {
  const limits = getPlanLimits(planId);
  return (
    counts.teamMembers <= limits.teamMembers &&
    counts.activeProjects <= limits.activeProjects
  );
}

/**
 * Check if a workspace can downgrade to the target plan given its current usage.
 */
export function canDowngradeTo(
  targetPlan: PlanId,
  counts: { teamMembers: number; activeProjects: number; activeUsers?: number }
): { canDowngrade: boolean; reason?: string } {
  const limits = getPlanLimits(targetPlan);
  const sp = PLANS[targetPlan].seatPricing;

  if (counts.teamMembers > limits.teamMembers) {
    return {
      canDowngrade: false,
      reason: `You have ${counts.teamMembers} team members, but ${PLANS[targetPlan].name} allows up to ${limits.teamMembers}. Please archive some team members first.`,
    };
  }

  if (counts.activeProjects > limits.activeProjects) {
    return {
      canDowngrade: false,
      reason: `You have ${counts.activeProjects} active projects, but ${PLANS[targetPlan].name} allows up to ${limits.activeProjects}. Please archive some projects first.`,
    };
  }

  if (counts.activeUsers !== undefined && counts.activeUsers > sp.maxSeats) {
    return {
      canDowngrade: false,
      reason: `You have ${counts.activeUsers} active users, but ${PLANS[targetPlan].name} supports up to ${sp.maxSeats} seats. Please deactivate some users first.`,
    };
  }

  return { canDowngrade: true };
}

// ---------------------------------------------------------------------------
// Trial helpers
// ---------------------------------------------------------------------------

/**
 * Get the trial end date (TRIAL_DAYS from now).
 */
export function getTrialEndDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + TRIAL_DAYS);
  return date;
}

/**
 * Get the number of days remaining in a trial.
 */
export function getDaysRemaining(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const now = new Date();
  const diff = trialEndsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Check if a trial has expired.
 */
export function isTrialExpired(trialEndsAt: Date | null): boolean {
  if (!trialEndsAt) return false;
  return new Date() > trialEndsAt;
}

/**
 * Check if a trial is currently active (not expired and not yet subscribed).
 */
export function isTrialActive(
  trialEndsAt: Date | null,
  subscribedAt: Date | null
): boolean {
  if (subscribedAt) return false; // Already subscribed
  if (!trialEndsAt) return false;
  return !isTrialExpired(trialEndsAt);
}
