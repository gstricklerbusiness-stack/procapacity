"use client";

import { useActionState } from "react";
import { use, useEffect, useState } from "react";
import { acceptInviteAction, ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const initialState: ActionState = {};

interface InviteInfo {
  workspaceName: string;
  email: string;
  valid: boolean;
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [state, formAction, isPending] = useActionState(acceptInviteAction, initialState);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch invite info
    async function checkInvite() {
      try {
        const res = await fetch(`/api/invites/${token}`);
        if (res.ok) {
          const data = await res.json();
          setInviteInfo(data);
        } else {
          setInviteInfo({ workspaceName: "", email: "", valid: false });
        }
      } catch {
        setInviteInfo({ workspaceName: "", email: "", valid: false });
      } finally {
        setLoading(false);
      }
    }
    checkInvite();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-slate-400" viewBox="0 0 24 24">
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
      </div>
    );
  }

  if (!inviteInfo?.valid) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Invalid or expired invite
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            This invite link is no longer valid. Please ask your team admin for a new invite.
          </p>
        </div>
        <Link href="/login">
          <Button variant="outline" className="mt-4">
            Go to login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Mobile logo */}
      <div className="lg:hidden text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Pro<span className="text-emerald-500">Capacity</span>
        </h1>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Join {inviteInfo.workspaceName}
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          You&apos;ve been invited to join as a team member
        </p>
      </div>

      {state.error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
        </div>
      )}

      <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Invited email
        </p>
        <p className="font-medium text-slate-900 dark:text-white">
          {inviteInfo.email}
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="token" value={token} />

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
          <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
            Create password
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
            "Accept invite"
          )}
        </Button>
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

