"use client";

import { useActionState } from "react";
import { use, useEffect, useState } from "react";
import { acceptInviteAction, ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, AlertCircle, Clock, Users, Loader2 } from "lucide-react";

const initialState: ActionState = {};

interface InviteInfo {
  workspaceName: string;
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
    async function checkInvite() {
      try {
        const res = await fetch(`/api/invites/${token}`);
        if (res.ok) {
          const data = await res.json();
          setInviteInfo(data);
        } else {
          setInviteInfo({ workspaceName: "", valid: false });
        }
      } catch {
        setInviteInfo({ workspaceName: "", valid: false });
      } finally {
        setLoading(false);
      }
    }
    checkInvite();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-slate-500">Verifying your invite...</p>
      </div>
    );
  }

  if (!inviteInfo?.valid) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Invalid or expired invite
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            This invite link is no longer valid. Please ask your team admin to send you a new invite.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/login">
            <Button variant="outline">Go to login</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-emerald-600 hover:bg-emerald-500">Create new workspace</Button>
          </Link>
        </div>
      </div>
    );
  }

  // If the action succeeded, the user gets redirected to /. So state.error === undefined + isPending === false after the form submit means it succeeded.
  // However, since redirect() throws, we won't see a success state. Let's keep the form-focused UI.

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="text-center">
        <Image
          src="/logo.png"
          alt="ProCapacity"
          width={180}
          height={40}
          className="mx-auto"
          priority
        />
      </div>

      {/* Welcome card */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 text-center space-y-2">
        <div className="w-10 h-10 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
          <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          You&apos;re invited to join
        </h2>
        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
          {inviteInfo.workspaceName}
        </p>
      </div>

      {state.error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {state.error}
            </p>
            {state.error.includes("already exists") && (
              <p className="text-xs text-red-500/80 mt-1">
                Try <Link href="/login" className="underline font-medium">signing in</Link> instead.
              </p>
            )}
          </div>
        </div>
      )}

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="token" value={token} />

        <div className="space-y-2">
          <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
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
          <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
            Create a password
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
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            At least 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          disabled={isPending}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating your account...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Accept invite &amp; join
            </span>
          )}
        </Button>
      </form>

      <div className="text-center space-y-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
          >
            Sign in
          </Link>
        </p>
        <p className="text-xs text-slate-400">
          By accepting, you agree to the{" "}
          <Link href="/terms" className="underline hover:text-slate-600">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}

