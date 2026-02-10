"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const SHORTCUTS = [
  { section: "Navigation", items: [
    { keys: ["g", "d"], label: "Go to Dashboard" },
    { keys: ["g", "t"], label: "Go to Team" },
    { keys: ["g", "p"], label: "Go to Projects" },
    { keys: ["g", "c"], label: "Go to Capacity" },
    { keys: ["g", "r"], label: "Go to Reports" },
    { keys: ["g", "s"], label: "Go to Settings" },
  ]},
  { section: "Actions", items: [
    { keys: ["n", "p"], label: "New Project" },
    { keys: ["n", "t"], label: "New Team Member" },
  ]},
  { section: "General", items: [
    { keys: ["?"], label: "Show keyboard shortcuts" },
    { keys: ["Esc"], label: "Close dialog/modal" },
  ]},
];

const NAV_MAP: Record<string, string> = {
  d: "/",
  t: "/team",
  p: "/projects",
  c: "/capacity",
  r: "/reports",
  s: "/settings",
};

export function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const [prefix, setPrefix] = useState<string | null>(null);
  const [prefixTimeout, setPrefixTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // ? to show help
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      // Escape to close help
      if (e.key === "Escape") {
        setPrefix(null);
        return;
      }

      const key = e.key.toLowerCase();

      // Handle prefix sequences
      if (prefix === "g") {
        const path = NAV_MAP[key];
        if (path) {
          e.preventDefault();
          router.push(path);
        }
        setPrefix(null);
        if (prefixTimeout) clearTimeout(prefixTimeout);
        return;
      }

      if (prefix === "n") {
        if (key === "p") {
          e.preventDefault();
          router.push("/projects");
        } else if (key === "t") {
          e.preventDefault();
          router.push("/team");
        }
        setPrefix(null);
        if (prefixTimeout) clearTimeout(prefixTimeout);
        return;
      }

      // Set prefix
      if (key === "g" || key === "n") {
        setPrefix(key);
        if (prefixTimeout) clearTimeout(prefixTimeout);
        const timeout = setTimeout(() => setPrefix(null), 1500);
        setPrefixTimeout(timeout);
        return;
      }
    },
    [prefix, prefixTimeout, router]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (prefixTimeout) clearTimeout(prefixTimeout);
    };
  }, [handleKeyDown, prefixTimeout]);

  return (
    <>
      {/* Prefix indicator */}
      {prefix && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-xs font-mono mr-1">
            {prefix}
          </kbd>
          waiting...
        </div>
      )}

      {/* Help dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {SHORTCUTS.map((section) => (
              <div key={section.section}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  {section.section}
                </h3>
                <div className="space-y-1.5">
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, i) => (
                          <span key={i}>
                            {i > 0 && (
                              <span className="text-xs text-slate-400 mx-0.5">
                                then
                              </span>
                            )}
                            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
