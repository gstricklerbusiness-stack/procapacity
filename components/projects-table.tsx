"use client";

import { useState } from "react";
import { Project } from "@prisma/client";
import Link from "next/link";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ProjectModal } from "@/components/project-modal";
import { deleteProject } from "@/app/actions/projects";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  FolderKanban,
  ExternalLink,
  RefreshCw,
  Clock,
  Users,
  X,
  Folder,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ProgressBar } from "@/components/ui/progress-bar";

interface ProjectWithWorkload extends Project {
  _count: {
    assignments: number;
  };
  totalHoursPerWeek: number;
  uniqueAssignees: number;
}

interface ProjectsTableProps {
  projects: ProjectWithWorkload[];
  isOwner: boolean;
}

export function ProjectsTable({ projects, isOwner }: ProjectsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesType = typeFilter === "all" || project.type === typeFilter;
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDelete = async (id: string, name: string) => {
    const result = await deleteProject(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`"${name}" has been archived`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100">
            Active
          </Badge>
        );
      case "COMPLETED":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="outline">Planned</Badge>;
    }
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || typeFilter !== "all" || statusFilter !== "all";
  const activeFilterCount = [searchQuery, typeFilter !== "all", statusFilter !== "all"].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white dark:bg-slate-900"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px] bg-white dark:bg-slate-900">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="PROJECT">Project</SelectItem>
            <SelectItem value="RETAINER">Retainer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px] bg-white dark:bg-slate-900">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PLANNED">Planned</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-slate-500 hover:text-slate-700"
          >
            <X className="h-3 w-3" />
            Clear
            {activeFilterCount > 1 && (
              <Badge variant="secondary" className="ml-1 h-5 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-slate-500 dark:text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <FolderKanban className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
              No projects found
            </p>
            <p className="text-sm text-center max-w-sm mt-1">
              {projects.length === 0
                ? "Create your first project to get started"
                : "Try adjusting your search or filters"}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-4"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/50 dark:bg-slate-800/30">
                <TableHead className="font-semibold">Project</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="hidden md:table-cell font-semibold">Dates</TableHead>
                <TableHead className="text-center font-semibold">Workload</TableHead>
                {isOwner && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredProjects.map((project) => {
                // Determine border color based on status
                const statusBorderColor = project.status === "ACTIVE"
                  ? "border-l-emerald-500"
                  : project.status === "PLANNED"
                  ? "border-l-blue-500"
                  : "border-l-slate-300 dark:border-l-slate-600";

                return (
                <TableRow 
                  key={project.id} 
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-l-4 ${statusBorderColor}`}
                >
                  <TableCell>
                    <Link
                      href={`/projects/${project.id}`}
                      className="group flex items-center gap-3"
                    >
                      <div className={`p-2 rounded-lg ${
                        project.type === "RETAINER"
                          ? "bg-purple-100 dark:bg-purple-900/40"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}>
                        {project.type === "RETAINER" ? (
                          <RefreshCw className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <Folder className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                          {project.name}
                        </p>
                        {project.clientName && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {project.clientName}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={project.type === "RETAINER" ? "default" : "outline"}
                      className={`text-xs font-normal ${
                        project.type === "RETAINER"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-100"
                          : ""
                      }`}
                    >
                      {project.type === "RETAINER" ? "Retainer" : "Project"}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(project.status)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="text-sm">
                      <p className="text-slate-900 dark:text-white">
                        {format(new Date(project.startDate), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {project.endDate
                          ? `to ${format(new Date(project.endDate), "MMM d, yyyy")}`
                          : "Ongoing"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      {project.totalHoursPerWeek > 0 ? (
                        <>
                          <Badge variant="outline" className="text-[10px] font-medium px-1.5">
                            <Clock className="h-3 w-3 mr-1" />
                            {project.totalHoursPerWeek}h/wk
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-medium px-1.5">
                            <Users className="h-3 w-3 mr-1" />
                            {project.uniqueAssignees}
                          </Badge>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No assignments</span>
                      )}
                    </div>
                  </TableCell>
                  {isOwner && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <ProjectModal mode="edit" project={project}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </ProjectModal>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Archive
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Archive &quot;{project.name}&quot;?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will archive the project and hide it from the active projects list.
                                  All assignments will be preserved.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleDelete(project.id, project.name)}
                                >
                                  Archive
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Stats footer */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <p>
          Showing {filteredProjects.length} of {projects.length} projects
        </p>
        <div className="flex gap-4">
          <p>
            Active:{" "}
            <span className="font-medium text-slate-900 dark:text-white">
              {projects.filter((p) => p.status === "ACTIVE").length}
            </span>
          </p>
          <p>
            Retainers:{" "}
            <span className="font-medium text-slate-900 dark:text-white">
              {projects.filter((p) => p.type === "RETAINER").length}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

