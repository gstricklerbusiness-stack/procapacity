"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Something went wrong");
      } else {
        setIsSubmitted(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="space-y-8">
        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center gap-2">
          <Image
            src="/logo.png"
            alt="ProCapacity"
            width={48}
            height={48}
            className="h-12 w-12"
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pro<span className="text-emerald-500">Capacity</span>
          </h1>
        </div>

        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Mail className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Check your email
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            If an account exists with <strong>{email}</strong>, we&apos;ve sent a
            password reset link.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsSubmitted(false);
              setEmail("");
            }}
          >
            Try a different email
          </Button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            <Link
              href="/login"
              className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Mobile logo */}
      <div className="lg:hidden flex flex-col items-center gap-2">
        <Image
          src="/logo.png"
          alt="ProCapacity"
          width={48}
          height={48}
          className="h-12 w-12"
        />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Pro<span className="text-emerald-500">Capacity</span>
        </h1>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Forgot your password?
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@agency.com"
            required
            autoComplete="email"
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Sending...
            </span>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        <Link
          href="/login"
          className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

