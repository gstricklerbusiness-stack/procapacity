"use client";

import { useState, useActionState, useEffect } from "react";
import { TeamMember, SkillProficiency } from "@prisma/client";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { createTeamMember, updateTeamMember, ActionState } from "@/app/actions/team";
import { updateMemberSkills, createSkill } from "@/app/actions/skills";
import { PRESET_ROLES } from "@/lib/constants";
import { PROFICIENCY_LABELS, SKILL_CATEGORY_META } from "@/lib/seed-skills";
import { UpgradeCTAModal } from "@/components/upgrade-cta-modal";
import type { PlanId } from "@/lib/pricing";
import { toast } from "sonner";
import { Plus, X, ChevronDown, Search } from "lucide-react";

interface WorkspaceSkill {
  id: string;
  name: string;
  category: string;
}

interface MemberSkillEntry {
  skillId: string;
  skillName: string;
  proficiency: SkillProficiency;
}

interface TeamMemberModalProps {
  mode: "create" | "edit";
  teamMember?: TeamMember & {
    teamMemberSkills?: { skillId: string; skill: { id: string; name: string }; proficiency: SkillProficiency }[];
  };
  workspaceSkills?: WorkspaceSkill[];
  currentPlan?: PlanId;
  teamMemberCount?: number;
  teamMemberLimit?: number;
  children: React.ReactNode;
}

const initialState: ActionState = {};

const PROFICIENCY_OPTIONS: { value: SkillProficiency; label: string }[] = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "PROFICIENT", label: "Proficient" },
  { value: "EXPERT", label: "Expert" },
];

export function TeamMemberModal({ mode, teamMember, workspaceSkills = [], currentPlan, teamMemberCount, teamMemberLimit, children }: TeamMemberModalProps) {
  const [open, setOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [customRole, setCustomRole] = useState(false);
  
  // New skills system state
  const [memberSkills, setMemberSkills] = useState<MemberSkillEntry[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [customSkillInput, setCustomSkillInput] = useState("");

  // Legacy skills (for backward compat / hidden field)
  const legacySkills = memberSkills.map((s) => s.skillName);

  const action = mode === "create" ? createTeamMember : updateTeamMember;
  const [state, formAction, isPending] = useActionState(action, initialState);

  // Check if current role is a preset role
  const isPresetRole = teamMember?.role && PRESET_ROLES.includes(teamMember.role as typeof PRESET_ROLES[number]);

  // Initialize member skills from teamMemberSkills relation
  useEffect(() => {
    if (open && teamMember?.teamMemberSkills) {
      setMemberSkills(
        teamMember.teamMemberSkills.map((tms) => ({
          skillId: tms.skillId,
          skillName: tms.skill.name,
          proficiency: tms.proficiency,
        }))
      );
    } else if (open && teamMember?.skills && workspaceSkills.length > 0) {
      // Fallback: map from String[] to workspace skills
      const mapped: MemberSkillEntry[] = [];
      for (const skillName of teamMember.skills) {
        const ws = workspaceSkills.find((s) => s.name === skillName);
        if (ws) {
          mapped.push({ skillId: ws.id, skillName: ws.name, proficiency: "PROFICIENT" });
        }
      }
      setMemberSkills(mapped);
    } else if (open) {
      setMemberSkills([]);
    }
  }, [open, teamMember, workspaceSkills]);

  // Handle action result
  useEffect(() => {
    if (state.success) {
      // If edit mode and we have skills, also update the join table
      if (mode === "edit" && teamMember) {
        updateMemberSkills(
          teamMember.id,
          memberSkills.map((s) => ({ skillId: s.skillId, proficiency: s.proficiency }))
        ).catch(console.error);
      }
      setOpen(false);
      toast.success(mode === "create" ? "Team member added" : "Team member updated");
    }
    if (state.error) {
      if (state.upgradeRequired && currentPlan) {
        setOpen(false);
        setUpgradeModalOpen(true);
      } else {
        toast.error(state.error);
      }
    }
  }, [state, mode, currentPlan]);

  const handleAddSkill = (skill: WorkspaceSkill) => {
    if (memberSkills.some((s) => s.skillId === skill.id)) return;
    setMemberSkills([
      ...memberSkills,
      { skillId: skill.id, skillName: skill.name, proficiency: "PROFICIENT" },
    ]);
    setSkillSearch("");
    setShowSkillDropdown(false);
  };

  const handleRemoveSkill = (skillId: string) => {
    setMemberSkills(memberSkills.filter((s) => s.skillId !== skillId));
  };

  const handleProficiencyChange = (skillId: string, proficiency: SkillProficiency) => {
    setMemberSkills(
      memberSkills.map((s) =>
        s.skillId === skillId ? { ...s, proficiency } : s
      )
    );
  };

  const handleAddCustomSkill = async () => {
    if (!customSkillInput.trim()) return;
    const formData = new FormData();
    formData.set("name", customSkillInput.trim());
    formData.set("category", "CUSTOM");
    const result = await createSkill(formData);
    if (result.skillId) {
      setMemberSkills([
        ...memberSkills,
        { skillId: result.skillId, skillName: customSkillInput.trim(), proficiency: "PROFICIENT" },
      ]);
      setCustomSkillInput("");
      toast.success(`Skill "${customSkillInput.trim()}" created`);
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  // Filter available skills (not yet selected)
  const selectedIds = new Set(memberSkills.map((s) => s.skillId));
  const availableSkills = workspaceSkills.filter(
    (s) =>
      !selectedIds.has(s.id) &&
      (skillSearch === "" || s.name.toLowerCase().includes(skillSearch.toLowerCase()))
  );

  const hasWorkspaceSkills = workspaceSkills.length > 0;

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
          <input type="hidden" name="skills" value={legacySkills.join(",")} />

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
              
              {hasWorkspaceSkills ? (
                <>
                  {/* Skills search/select */}
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        value={skillSearch}
                        onChange={(e) => {
                          setSkillSearch(e.target.value);
                          setShowSkillDropdown(true);
                        }}
                        onFocus={() => setShowSkillDropdown(true)}
                        placeholder="Search skills..."
                        className="pl-9"
                      />
                    </div>
                    {showSkillDropdown && availableSkills.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                        {availableSkills.slice(0, 20).map((skill) => {
                          const catMeta = SKILL_CATEGORY_META[skill.category as keyof typeof SKILL_CATEGORY_META];
                          return (
                            <button
                              key={skill.id}
                              type="button"
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              onClick={() => handleAddSkill(skill)}
                            >
                              <span className="flex-1 text-slate-900 dark:text-white">{skill.name}</span>
                              {catMeta && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${catMeta.color}`}>
                                  {catMeta.label}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Custom skill inline add */}
                  <div className="flex gap-2">
                    <Input
                      value={customSkillInput}
                      onChange={(e) => setCustomSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomSkill();
                        }
                      }}
                      placeholder="Add custom skill..."
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCustomSkill}
                      disabled={!customSkillInput.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Selected skills with proficiency */}
                  {memberSkills.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {memberSkills.map((ms) => {
                        const profMeta = PROFICIENCY_LABELS[ms.proficiency];
                        return (
                          <div
                            key={ms.skillId}
                            className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                          >
                            <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">
                              {ms.skillName}
                            </span>
                            <Select
                              value={ms.proficiency}
                              onValueChange={(val) =>
                                handleProficiencyChange(ms.skillId, val as SkillProficiency)
                              }
                            >
                              <SelectTrigger className="w-[120px] h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PROFICIENCY_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(ms.skillId)}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* Fallback: legacy free-text input when no workspace skills exist */
                <LegacySkillInput skills={legacySkills} onChange={(newSkills) => {
                  setMemberSkills(newSkills.map((name) => ({
                    skillId: name,
                    skillName: name,
                    proficiency: "PROFICIENT" as SkillProficiency,
                  })));
                }} />
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

    {currentPlan && (
      <UpgradeCTAModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        limitType="teamMembers"
        currentPlan={currentPlan}
        currentCount={teamMemberCount ?? 0}
        limit={teamMemberLimit ?? 0}
      />
    )}
    </>
  );
}

// ─── Legacy free-text skill input fallback ────────────────────────

function LegacySkillInput({
  skills,
  onChange,
}: {
  skills: string[];
  onChange: (skills: string[]) => void;
}) {
  const [skillInput, setSkillInput] = useState("");

  const handleAdd = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      onChange([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };  return (
    <>
      <div className="flex gap-2">
        <Input
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add a skill..."
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
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
                onClick={() => onChange(skills.filter((s) => s !== skill))}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
