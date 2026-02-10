"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRESET_ROLES, PRESET_SKILLS } from "@/lib/constants";
import { UserPlus, FlaskConical, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

export interface SimulatedMember {
  id: string;
  name: string;
  role: string;
  skills: string[];
  defaultWeeklyCapacityHours: number;
  isSimulated: true;
}

interface SimulationPanelProps {
  simulatedMembers: SimulatedMember[];
  onAddMember: (member: SimulatedMember) => void;
  onRemoveMember: (id: string) => void;
  onCommitMember: (member: SimulatedMember) => void;
  onClearAll: () => void;
}

export function SimulationPanel({
  simulatedMembers,
  onAddMember,
  onRemoveMember,
  onCommitMember,
  onClearAll,
}: SimulationPanelProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [capacity, setCapacity] = useState("40");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const handleAdd = () => {
    if (!name || !role) {
      toast.error("Name and role are required");
      return;
    }

    const member: SimulatedMember = {
      id: `sim-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name,
      role,
      skills: selectedSkills,
      defaultWeeklyCapacityHours: parseInt(capacity) || 40,
      isSimulated: true,
    };

    onAddMember(member);
    toast.success(`Added hypothetical team member: ${name}`);
    setAddDialogOpen(false);
    // Reset form
    setName("");
    setRole("");
    setCapacity("40");
    setSelectedSkills([]);
  };

  const isActive = simulatedMembers.length > 0;

  return (
    <Card className={`shadow-card ${isActive ? "border-purple-300 dark:border-purple-700 bg-purple-50/30 dark:bg-purple-900/10" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isActive ? "bg-purple-100 dark:bg-purple-900/40" : "bg-slate-100 dark:bg-slate-800"}`}>
            <FlaskConical className={`h-5 w-5 ${isActive ? "text-purple-600 dark:text-purple-400" : "text-slate-600 dark:text-slate-400"}`} />
          </div>
          <div>
            <CardTitle className="text-base">What-If Scenarios</CardTitle>
            <CardDescription className="text-xs">
              {isActive
                ? `${simulatedMembers.length} hypothetical member${simulatedMembers.length !== 1 ? "s" : ""}`
                : "Simulate hiring to see impact"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Simulated members list */}
        {simulatedMembers.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-2 p-2.5 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 bg-white/60 dark:bg-slate-800/60"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {member.name}
              </p>
              <p className="text-xs text-slate-500">
                {member.role} &bull; {member.defaultWeeklyCapacityHours}h/wk
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                onClick={() => onCommitMember(member)}
                title="Commit hire (add for real)"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => onRemoveMember(member.id)}
                title="Discard"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {/* Add hypothetical person */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-dashed gap-2"
              size="sm"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add hypothetical person
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-purple-500" />
                Add hypothetical team member
              </DialogTitle>
              <DialogDescription>
                This person will appear in the capacity grid with a dashed border.
                You can assign them to projects to see how it affects capacity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sim-name">Name *</Label>
                <Input
                  id="sim-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. New Designer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sim-role">Role *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sim-capacity">Weekly capacity (hours)</Label>
                <Input
                  id="sim-capacity"
                  type="number"
                  min="1"
                  max="168"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_SKILLS.slice(0, 8).map((skill) => (
                    <Badge
                      key={skill}
                      variant={selectedSkills.includes(skill) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() =>
                        setSelectedSkills((prev) =>
                          prev.includes(skill)
                            ? prev.filter((s) => s !== skill)
                            : [...prev, skill]
                        )
                      }
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                className="bg-purple-600 hover:bg-purple-500"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add to simulation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear all */}
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50/50"
            onClick={onClearAll}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Clear all simulations
          </Button>
        )}

        {!isActive && (
          <p className="text-xs text-slate-400 text-center">
            Add hypothetical team members to see how hiring affects your capacity.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
