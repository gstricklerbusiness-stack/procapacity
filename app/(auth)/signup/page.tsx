"use client";

import { useActionState } from "react";
import { signUpAction, ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";

const initialState: ActionState = {};

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, initialState);

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
          Start your free trial
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          14 days free. No credit card required.
        </p>
      </div>

      {state.error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
        </div>
      )}

      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
            Your name
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Jane Smith"
            required
            autoComplete="name"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
            Work email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="jane@agency.com"
            required
            autoComplete="email"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="new-password"
            className="h-11"
          />
          <p className="text-xs text-slate-500">
            At least 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="workspaceName" className="text-slate-700 dark:text-slate-300">
            Agency name
          </Label>
          <Input
            id="workspaceName"
            name="workspaceName"
            type="text"
            placeholder="Acme Marketing"
            required
            className="h-11"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
          disabled={isPending}
        >
          {isPending ? (
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
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </Button>

        <p className="text-xs text-center text-slate-500 dark:text-slate-400">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-slate-700 dark:hover:text-slate-300">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-slate-700 dark:hover:text-slate-300">
            Privacy Policy
          </Link>
        </p>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

