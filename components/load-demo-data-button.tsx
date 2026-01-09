"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

export function LoadDemoDataButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLoadDemo() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/workspace/seed-demo", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load demo data");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={handleLoadDemo}
        disabled={loading}
        size="lg"
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading demo data...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Load example data
          </>
        )}
      </Button>
      <p className="text-xs text-slate-400 text-center max-w-xs">
        Recommended for first-time users – see ProCapacity in action in 10 seconds.
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

