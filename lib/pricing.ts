// ProCapacity Pricing Configuration

export type PlanId = "STARTER" | "GROWTH" | "SCALE";
export type BillingPeriod = "MONTHLY" | "YEARLY";

export interface PlanLimits {
  teamMembers: number;
  activeProjects: number;
  ownerUsers: number;
}

export interface PlanPricing {
  monthly: number;
  yearly: number;
}

export interface PlanFeature {
  name: string;
  starter: string | boolean;
  growth: string | boolean;
  scale: string | boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  bestFor: string;
  pricing: PlanPricing;
  limits: PlanLimits;
  features: string[];
  highlighted?: boolean;
}

// Plan definitions
export const PLANS: Record<PlanId, Plan> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    description: "For small agencies getting started with capacity planning",
    bestFor: "Small agencies (5-10 people)",
    pricing: {
      monthly: 149,
      yearly: 1490, // 2 months free
    },
    limits: {
      teamMembers: 10,
      activeProjects: 25,
      ownerUsers: 1,
    },
    features: [
      "Up to 10 team members",
      "Up to 25 active projects/retainers",
      "Team management (roles, skills, capacity)",
      "Capacity calendar with color-coded view",
      "Over-allocation warnings",
      "Who's Free search",
      "Weekly utilization report + CSV export",
      "Email support (2-business-day response)",
    ],
  },
  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    description: "For growing agencies with multiple teams",
    bestFor: "Growing agencies (10-30 people)",
    pricing: {
      monthly: 299,
      yearly: 2990, // 2 months free
    },
    limits: {
      teamMembers: 30,
      activeProjects: 75,
      ownerUsers: 3,
    },
    features: [
      "Up to 30 team members",
      "Up to 75 active projects/retainers",
      "Everything in Starter, plus:",
      "Role & department filters",
      "Advanced report filters",
      "Priority email support (next-business-day)",
      "Early access to integrations",
      "Optional 30-min onboarding call",
    ],
    highlighted: true,
  },
  SCALE: {
    id: "SCALE",
    name: "Scale",
    description: "For larger agencies who rely on capacity data",
    bestFor: "Large agencies (30-60 people)",
    pricing: {
      monthly: 499,
      yearly: 4990, // 2 months free
    },
    limits: {
      teamMembers: 60,
      activeProjects: 150,
      ownerUsers: 5,
    },
    features: [
      "Up to 60 team members",
      "Up to 150 active projects/retainers",
      "Everything in Growth, plus:",
      "Priority support (same-day weekdays)",
      "Dedicated onboarding setup",
      "Extended data retention (12-18 months)",
      "Custom integration requests",
      "5 owner/admin users",
    ],
  },
};

// Feature comparison for pricing table
export const FEATURE_COMPARISON: PlanFeature[] = [
  {
    name: "Team members",
    starter: "Up to 10",
    growth: "Up to 30",
    scale: "Up to 60",
  },
  {
    name: "Active projects/retainers",
    starter: "Up to 25",
    growth: "Up to 75",
    scale: "Up to 150",
  },
  {
    name: "Owner/admin users",
    starter: "1",
    growth: "3",
    scale: "5",
  },
  {
    name: "Capacity calendar",
    starter: true,
    growth: true,
    scale: true,
  },
  {
    name: "Over-allocation warnings",
    starter: true,
    growth: true,
    scale: true,
  },
  {
    name: "Who's Free search",
    starter: true,
    growth: true,
    scale: true,
  },
  {
    name: "Utilization reports + CSV",
    starter: true,
    growth: true,
    scale: true,
  },
  {
    name: "Role & department filters",
    starter: false,
    growth: true,
    scale: true,
  },
  {
    name: "Advanced report filters",
    starter: false,
    growth: true,
    scale: true,
  },
  {
    name: "Integrations (Google Cal, Slack)",
    starter: false,
    growth: "Early access",
    scale: true,
  },
  {
    name: "Data retention",
    starter: "6 months",
    growth: "12 months",
    scale: "18 months",
  },
  {
    name: "Support response time",
    starter: "2 business days",
    growth: "Next business day",
    scale: "Same day (weekdays)",
  },
  {
    name: "Onboarding",
    starter: "Self-service",
    growth: "30-min call",
    scale: "Dedicated setup",
  },
];

// FAQ items
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
    question: "Is there a plan for larger agencies (60+ people)?",
    answer:
      "Yes! Contact us for custom pricing if you have more than 60 team members. We'll work with you to create a plan that fits your needs.",
  },
];

// Trial configuration
export const TRIAL_DAYS = 14;
export const DEFAULT_TRIAL_PLAN: PlanId = "GROWTH";

// Stripe price IDs (to be configured with actual Stripe price IDs)
export const STRIPE_PRICE_IDS: Record<PlanId, { monthly: string; yearly: string }> = {
  STARTER: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || "",
  },
  GROWTH: {
    monthly: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_GROWTH_YEARLY_PRICE_ID || "",
  },
  SCALE: {
    monthly: process.env.STRIPE_SCALE_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_SCALE_YEARLY_PRICE_ID || "",
  },
};

// Helper functions
export function getPlan(planId: PlanId): Plan {
  return PLANS[planId];
}

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLANS[planId].limits;
}

export function getPlanPrice(planId: PlanId, period: BillingPeriod): number {
  const plan = PLANS[planId];
  return period === "YEARLY" ? plan.pricing.yearly : plan.pricing.monthly;
}

export function getYearlySavings(planId: PlanId): number {
  const plan = PLANS[planId];
  return plan.pricing.monthly * 12 - plan.pricing.yearly;
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

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

export function canDowngradeTo(
  targetPlan: PlanId,
  counts: { teamMembers: number; activeProjects: number }
): { canDowngrade: boolean; reason?: string } {
  const limits = getPlanLimits(targetPlan);

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

  return { canDowngrade: true };
}

export function getTrialEndDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + TRIAL_DAYS);
  return date;
}

export function getDaysRemaining(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const now = new Date();
  const diff = trialEndsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function isTrialExpired(trialEndsAt: Date | null): boolean {
  if (!trialEndsAt) return false;
  return new Date() > trialEndsAt;
}

export function isTrialActive(trialEndsAt: Date | null, subscribedAt: Date | null): boolean {
  if (subscribedAt) return false; // Already subscribed
  if (!trialEndsAt) return false;
  return !isTrialExpired(trialEndsAt);
}

