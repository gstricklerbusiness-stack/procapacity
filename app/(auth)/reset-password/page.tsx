"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
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
            <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Password reset successful
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Your password has been updated. Redirecting to sign in...
          </p>
        </div>

        <Link href="/login">
          <Button className="w-full">
            Sign in now
          </Button>
        </Link>
      </div>
    );
  }

  if (!token) {
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
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Invalid reset link
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            This password reset link is invalid or has expired.
          </p>
        </div>

        <Link href="/forgot-password">
          <Button variant="outline" className="w-full">
            Request a new reset link
          </Button>
        </Link>
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
          Reset your password
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Enter your new password below
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-slate-700 dark:text-slate-300">
            New Password
          </Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="••••••••"
            required
            className="h-11"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
          />
          <p className="text-xs text-slate-500">
            At least 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">
            Confirm New Password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            className="h-11"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
              Resetting...
            </span>
          ) : (
            "Reset password"
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

