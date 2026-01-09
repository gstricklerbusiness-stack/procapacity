import { Metadata } from "next";
import { PricingHero } from "@/components/pricing/pricing-hero";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { PricingComparison } from "@/components/pricing/pricing-comparison";
import { PricingFAQ } from "@/components/pricing/pricing-faq";

export const metadata: Metadata = {
  title: "Pricing - ProCapacity",
  description:
    "Simple, transparent pricing for growing agencies. All plans include full capacity planning features. Choose based on team size.",
};

export default function PricingPage() {
  return (
    <div className="py-16 sm:py-24">
      {/* Hero section */}
      <PricingHero />

      {/* Plan cards */}
      <section className="mt-16 sm:mt-24">
        <PricingCards />
      </section>

      {/* Feature comparison table */}
      <section className="mt-24 sm:mt-32">
        <PricingComparison />
      </section>

      {/* FAQ */}
      <section className="mt-24 sm:mt-32">
        <PricingFAQ />
      </section>

      {/* Bottom CTA */}
      <section className="mt-24 sm:mt-32">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Ready to know who&apos;s free?
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
            >
              Start free trial
            </a>
            <a
              href="https://calendly.com/procapacity/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Talk to sales
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

