"use client";

import { useState, useActionState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createSkill, deleteSkill, updateSkill } from "@/app/actions/skills";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SKILL_CATEGORY_META, INDUSTRY_SKILL_MAP } from "@/lib/seed-skills";
import type { IndustryVertical, SkillCategory } from "@prisma/client";
import { toast } from "sonner";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Sparkles, Filter } from "lucide-react";

interface SkillRow {
  id: string;
  name: string;
  category: SkillCategory;
  description: string | null;
  isPreset: boolean;
  usedByCount: number;
}

interface SkillsTableProps {
  skills: SkillRow[];
  isOwner: boolean;
  currentIndustry: IndustryVertical | null;
}

const CATEGORIES = Object.entries(SKILL_CATEGORY_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

export function SkillsTable({ skills, isOwner, currentIndustry }: SkillsTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillRow | null>(null);

  // Determine allowed categories based on workspace industry
  const allowedCategories: SkillCategory[] | null = currentIndustry
    ? [...(INDUSTRY_SKILL_MAP[currentIndustry] || []), "CUSTOM" as SkillCategory]
    : null;

  const filteredSkills = skills.filter((skill) => {
    if (search && !skill.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (categoryFilter !== "all" && skill.category !== categoryFilter) {
      return false;
    }
    // Industry filtering: only show skills whose category matches the industry,
    // custom skills, or skills that are in use by team members
    if (allowedCategories && skill.isPreset && skill.usedByCount === 0) {
      if (!allowedCategories.includes(skill.category)) {
        return false;
      }
    }
    return true;
  });

  const [deleteTarget, setDeleteTarget] = useState<SkillRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteSkill(deleteTarget.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`"${deleteTarget.name}" deleted`);
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const handleEdit = (skill: SkillRow) => {
    setEditingSkill(skill);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isOwner && (
          <AddSkillDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span>{skills.length} total skills</span>
        <span>{skills.filter((s) => s.isPreset).length} preset</span>
        <span>{skills.filter((s) => !s.isPreset).length} custom</span>
        {filteredSkills.length !== skills.length && (
          <span className="text-emerald-600 dark:text-emerald-400">
            {filteredSkills.length} shown
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Skill</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Used By</TableHead>
              <TableHead className="text-center">Source</TableHead>
              {isOwner && <TableHead className="w-[50px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSkills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 5 : 4} className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">
                    {search || categoryFilter !== "all"
                      ? "No skills match your filters"
                      : "No skills yet. Add your first skill to get started."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredSkills.map((skill) => {
                const catMeta = SKILL_CATEGORY_META[skill.category];
                return (
                  <TableRow key={skill.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {skill.name}
                        </p>
                        {skill.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {skill.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${catMeta.color} text-xs`} variant="secondary">
                        {catMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {skill.usedByCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {skill.isPreset ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Sparkles className="h-3 w-3" />
                          Preset
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Custom
                        </Badge>
                      )}
                    </TableCell>
                    {isOwner && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(skill)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400"
                              onClick={() => setDeleteTarget(skill)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                              {skill.usedByCount > 0 && (
                                <span className="ml-1 text-xs opacity-60">
                                  ({skill.usedByCount} using)
                                </span>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      {editingSkill && (
        <EditSkillDialog
          skill={editingSkill}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditingSkill(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description={
          deleteTarget && deleteTarget.usedByCount > 0
            ? `This skill is used by ${deleteTarget.usedByCount} team member${deleteTarget.usedByCount !== 1 ? "s" : ""}. Deleting it will remove it from their profiles.`
            : "This will permanently delete this skill."
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

// ─── Add Skill Dialog ─────────────────────────────────────────────

function AddSkillDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: any, formData: FormData) => {
      const result = await createSkill(formData);
      if (result.success) {
        toast.success("Skill created");
        onOpenChange(false);
      } else if (result.error) {
        toast.error(result.error);
      }
      return result;
    },
    {}
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-500 gap-2">
          <Plus className="h-4 w-4" />
          Add Skill
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add custom skill</DialogTitle>
          <DialogDescription>
            Create a new skill for your workspace
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skill-name">Name *</Label>
            <Input
              id="skill-name"
              name="name"
              placeholder="e.g. Litigation support"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-category">Category</Label>
            <Select name="category" defaultValue="CUSTOM">
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-description">Description (optional)</Label>
            <Textarea
              id="skill-description"
              name="description"
              placeholder="Brief description of this skill..."
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isPending ? "Creating..." : "Add Skill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Skill Dialog ────────────────────────────────────────────

function EditSkillDialog({
  skill,
  open,
  onOpenChange,
}: {
  skill: SkillRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: any, formData: FormData) => {
      const result = await updateSkill(formData);
      if (result.success) {
        toast.success("Skill updated");
        onOpenChange(false);
      } else if (result.error) {
        toast.error(result.error);
      }
      return result;
    },
    {}
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit skill</DialogTitle>
          <DialogDescription>Update skill details</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={skill.id} />
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              name="name"
              defaultValue={skill.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category</Label>
            <Select name="category" defaultValue={skill.category}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              name="description"
              defaultValue={skill.description || ""}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
