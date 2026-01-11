import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - ProCapacity",
  description: "ProCapacity Terms of Service (placeholder).",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
          Terms of Service
        </h1>

        <p className="mt-4 text-slate-600 dark:text-slate-400">
          This is a placeholder Terms of Service page. Replace this content with
          your legal terms before launching.
        </p>

        <div className="mt-10 space-y-4 text-sm text-slate-600 dark:text-slate-400">
          <p>
            <strong className="text-slate-900 dark:text-white">
              Last updated:
            </strong>{" "}
            [Add date]
          </p>
          <p>
            <strong className="text-slate-900 dark:text-white">Summary:</strong>{" "}
            [Add summary of terms]
          </p>
          <p>
            <strong className="text-slate-900 dark:text-white">Contact:</strong>{" "}
            [Add contact email]
          </p>
        </div>

        <div className="mt-12">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}


