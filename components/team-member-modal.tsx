"use client";

import { useState, useActionState, useEffect } from "react";
import { TeamMember } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createTeamMember, updateTeamMember, ActionState } from "@/app/actions/team";
import { PRESET_ROLES } from "@/lib/constants";
import { toast } from "sonner";

interface TeamMemberModalProps {
  mode: "create" | "edit";
  teamMember?: TeamMember;
  children: React.ReactNode;
}

const initialState: ActionState = {};

export function TeamMemberModal({ mode, teamMember, children }: TeamMemberModalProps) {
  const [open, setOpen] = useState(false);
  const [customRole, setCustomRole] = useState(false);
  const [skills, setSkills] = useState<string[]>(teamMember?.skills || []);
  const [skillInput, setSkillInput] = useState("");

  const action = mode === "create" ? createTeamMember : updateTeamMember;
  const [state, formAction, isPending] = useActionState(action, initialState);

  // Check if current role is a preset role
  const isPresetRole = teamMember?.role && PRESET_ROLES.includes(teamMember.role as typeof PRESET_ROLES[number]);

  // Handle action result
  useEffect(() => {
    if (state.success) {
      setOpen(false);
      toast.success(mode === "create" ? "Team member added" : "Team member updated");
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state, mode]);

  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add team member" : "Edit team member"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new team member to your workspace"
              : "Update team member details"}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-6">
          {mode === "edit" && <input type="hidden" name="id" value={teamMember?.id} />}
          <input type="hidden" name="skills" value={skills.join(",")} />

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={teamMember?.name}
                placeholder="Jane Smith"
                required
              />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={teamMember?.title || ""}
                placeholder="Senior Designer"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="role">Role *</Label>
                <label className="flex items-center gap-2 text-sm text-slate-500">
                  <input
                    type="checkbox"
                    checked={customRole || !isPresetRole}
                    onChange={(e) => setCustomRole(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Custom role
                </label>
              </div>
              {customRole || !isPresetRole ? (
                <Input
                  id="role"
                  name="role"
                  defaultValue={!isPresetRole ? teamMember?.role : ""}
                  placeholder="Enter custom role"
                  required
                />
              ) : (
                <Select name="role" defaultValue={teamMember?.role || PRESET_ROLES[0]}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a skill..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSkill}
                  disabled={!skillInput.trim()}
                >
                  Add
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Weekly Capacity */}
            <div className="space-y-2">
              <Label htmlFor="defaultWeeklyCapacityHours">Weekly capacity (hours)</Label>
              <Input
                id="defaultWeeklyCapacityHours"
                name="defaultWeeklyCapacityHours"
                type="number"
                min="1"
                max="168"
                defaultValue={teamMember?.defaultWeeklyCapacityHours || 40}
              />
            </div>

            {/* Active toggle (edit mode only) */}
            {mode === "edit" && (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                <div>
                  <Label htmlFor="active" className="text-base">
                    Active
                  </Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Inactive members won&apos;t appear in capacity planning
                  </p>
                </div>
                <input
                  type="hidden"
                  name="active"
                  value={teamMember?.active ? "true" : "false"}
                />
                <Switch
                  id="active"
                  defaultChecked={teamMember?.active}
                  onCheckedChange={(checked) => {
                    const input = document.querySelector(
                      'input[name="active"]'
                    ) as HTMLInputElement;
                    if (input) input.value = checked ? "true" : "false";
                  }}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isPending
                ? mode === "create"
                  ? "Adding..."
                  : "Saving..."
                : mode === "create"
                ? "Add member"
                : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

