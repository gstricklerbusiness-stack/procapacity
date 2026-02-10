"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { duplicateProject } from "@/app/actions/projects";
import { toast } from "sonner";

interface DuplicateProjectButtonProps {
  projectId: string;
}

export function DuplicateProjectButton({ projectId }: DuplicateProjectButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleDuplicate = async () => {
    setIsPending(true);
    try {
      const result = await duplicateProject(projectId);
      if (result.error) {
        toast.error(result.error);
      } else if (result.projectId) {
        toast.success("Project duplicated");
        router.push(`/projects/${result.projectId}`);
      }
    } catch {
      toast.error("Failed to duplicate project");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleDuplicate} disabled={isPending}>
      {isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Copy className="h-4 w-4 mr-2" />
      )}
      Duplicate
    </Button>
  );
}
