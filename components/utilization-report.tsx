"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, BarChart3, Users, Clock, TrendingUp, DollarSign, ChevronDown, FileText } from "lucide-react";
import { format, startOfWeek, addWeeks } from "date-fns";
import { getUtilizationColor } from "@/lib/constants";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReportData {
  teamMemberId: string;
  name: string;
  role: string;
  weekStart: Date;
  billableHours: number;
  nonBillableHours: number;
  totalHours: number;
  capacity: number;
  utilizationPercent: number;
}

interface UtilizationReportProps {
  workspaceId: string;
}

export function UtilizationReport({ workspaceId }: UtilizationReportProps) {
  const [startDate, setStartDate] = useState(() => {
    const date = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(date, "yyyy-MM-dd");
  });
  const [endDate, setEndDate] = useState(() => {
    const date = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 7);
    return format(date, "yyyy-MM-dd");
  });
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [includeNonBillable, setIncludeNonBillable] = useState(true);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch report data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
          ...(roleFilter !== "all" ? { role: roleFilter } : {}),
        });
        
        const response = await fetch(`/api/reports/utilization?${params}`);
        if (response.ok) {
          const data = await response.json();
          setReportData(data.reportData);
          setRoles(data.roles);
        }
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [startDate, endDate, roleFilter, workspaceId]);

  // Filter data based on includeNonBillable
  const filteredData = useMemo(() => {
    if (includeNonBillable) return reportData;
    return reportData.map((row) => ({
      ...row,
      totalHours: row.billableHours,
      utilizationPercent: row.capacity > 0 ? (row.billableHours / row.capacity) * 100 : 0,
    }));
  }, [reportData, includeNonBillable]);

  // Calculate summary stats
  const summary = useMemo(() => {
    if (filteredData.length === 0) return null;

    const uniqueMembers = new Set(filteredData.map((r) => r.teamMemberId)).size;
    const totalBillable = filteredData.reduce((sum, r) => sum + r.billableHours, 0);
    const totalNonBillable = filteredData.reduce((sum, r) => sum + r.nonBillableHours, 0);
    const totalCapacity = filteredData.reduce((sum, r) => sum + r.capacity, 0);
    const avgUtilization = totalCapacity > 0 
      ? ((includeNonBillable ? totalBillable + totalNonBillable : totalBillable) / totalCapacity) * 100 
      : 0;

    return {
      uniqueMembers,
      totalBillable,
      totalNonBillable,
      avgUtilization,
    };
  }, [filteredData, includeNonBillable]);

  // Export to CSV
  const handleExport = () => {
    const headers = [
      "Name",
      "Role",
      "Week",
      "Billable Hours",
      "Non-Billable Hours",
      "Total Hours",
      "Capacity",
      "Utilization %",
    ];

    const rows = filteredData.map((row) => [
      row.name,
      row.role,
      format(new Date(row.weekStart), "yyyy-MM-dd"),
      row.billableHours,
      row.nonBillableHours,
      row.totalHours,
      row.capacity,
      row.utilizationPercent.toFixed(1),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `utilization-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/50">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Start week</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white dark:bg-slate-900"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">End week</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white dark:bg-slate-900"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Role</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="bg-white dark:bg-slate-900">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">&nbsp;</Label>
            <div className="flex items-center gap-3 h-10 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <Switch
                id="includeNonBillable"
                checked={includeNonBillable}
                onCheckedChange={setIncludeNonBillable}
              />
              <Label htmlFor="includeNonBillable" className="text-sm font-normal cursor-pointer">
                Include non-billable hours
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="shadow-card card-interactive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Team Members
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {summary.uniqueMembers}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card card-interactive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Billable Hours
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {summary.totalBillable}h
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card card-interactive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Non-Billable Hours
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {summary.totalNonBillable}h
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Clock className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`shadow-card card-interactive ${
            summary.avgUtilization >= 80 
              ? "border-emerald-200 dark:border-emerald-800/50" 
              : "border-amber-200 dark:border-amber-800/50"
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Avg Utilization
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${
                    summary.avgUtilization >= 95 
                      ? "text-red-600 dark:text-red-400"
                      : summary.avgUtilization >= 80 
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}>
                    {summary.avgUtilization.toFixed(1)}%
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${
                  summary.avgUtilization >= 95 
                    ? "bg-red-100 dark:bg-red-900/40"
                    : summary.avgUtilization >= 80 
                    ? "bg-emerald-100 dark:bg-emerald-900/40"
                    : "bg-amber-100 dark:bg-amber-900/40"
                }`}>
                  <TrendingUp className={`h-5 w-5 ${
                    summary.avgUtilization >= 95 
                      ? "text-red-600 dark:text-red-400"
                      : summary.avgUtilization >= 80 
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data table */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle>Weekly Utilization by Person</CardTitle>
                <CardDescription>
                  Detailed breakdown of hours and utilization
                </CardDescription>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={filteredData.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const params = new URLSearchParams({
                      startDate: startDate,
                      endDate: endDate,
                      ...(roleFilter !== "all" ? { role: roleFilter } : {}),
                    });
                    window.open(`/api/reports/pdf?${params.toString()}`, "_blank");
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
                <span>Loading report data...</span>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-slate-500 dark:text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                No data for selected period
              </p>
              <p className="text-sm text-center max-w-sm mt-1">
                Try adjusting the date range or role filter to see utilization data
              </p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50/50 dark:bg-slate-800/30">
                    <TableHead className="font-semibold sticky left-0 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm">Name</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Week</TableHead>
                    <TableHead className="text-right font-semibold">Billable</TableHead>
                    <TableHead className="text-right font-semibold">Non-Billable</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                    <TableHead className="text-right font-semibold">Capacity</TableHead>
                    <TableHead className="text-center font-semibold min-w-[140px]">Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((row, idx) => (
                    <TableRow 
                      key={`${row.teamMemberId}-${row.weekStart}-${idx}`}
                      className={idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/30"}
                    >
                      <TableCell className="sticky left-0 bg-inherit">
                        <div className="flex items-center gap-2">
                          <AvatarInitials name={row.name} size="xs" />
                          <span className="font-medium">{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal text-xs">
                          {row.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        {format(new Date(row.weekStart), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {row.billableHours}h
                      </TableCell>
                      <TableCell className="text-right text-slate-500">
                        {row.nonBillableHours}h
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {row.totalHours}h
                      </TableCell>
                      <TableCell className="text-right text-slate-500">{row.capacity}h</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16">
                            <ProgressBar 
                              value={Math.min(row.utilizationPercent, 100)} 
                              size="sm"
                              animate={false}
                            />
                          </div>
                          <span
                            className={`inline-flex items-center justify-center w-12 text-xs font-semibold ${
                              row.utilizationPercent > 100 
                                ? "text-red-600 dark:text-red-400"
                                : row.utilizationPercent >= 80 
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {row.utilizationPercent.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

