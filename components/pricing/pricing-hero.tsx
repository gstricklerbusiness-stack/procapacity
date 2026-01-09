export function PricingHero() {
  return (
    <div className="container mx-auto px-4 text-center">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
        Simple pricing for growing agencies
      </h1>
      <p className="mt-6 text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
        All plans include full capacity planning features.
        <br className="hidden sm:inline" /> Choose based on team size.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
        <a
          href="/signup"
          className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
        >
          Start 14-day free trial
        </a>
        <a
          href="https://calendly.com/procapacity/demo"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl transition-colors"
        >
          Talk to sales
        </a>
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        No credit card required · Full access for 14 days
      </p>
    </div>
  );
}

