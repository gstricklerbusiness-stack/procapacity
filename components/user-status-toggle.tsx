"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Loader2, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UserStatusToggleProps {
  userId: string;
  userName?: string;
  active: boolean;
}

export function UserStatusToggle({ userId, userName, active }: UserStatusToggleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/user/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        router.refresh();
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to update user status");
    } finally {
      setIsLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (active) {
            setConfirmOpen(true);
          } else {
            handleToggle();
          }
        }}
        disabled={isLoading}
        className={`h-8 px-2 text-xs ${
          active
            ? "text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20"
            : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20"
        }`}
        title={active ? "Deactivate user" : "Reactivate user"}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : active ? (
          <UserX className="h-3.5 w-3.5" />
        ) : (
          <UserCheck className="h-3.5 w-3.5" />
        )}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Deactivate ${userName || "this user"}?`}
        description="This will revoke their access to ProCapacity and free up a billable seat. They can be reactivated later."
        confirmLabel="Deactivate"
        variant="warning"
        onConfirm={handleToggle}
        loading={isLoading}
      />
    </>
  );
}
