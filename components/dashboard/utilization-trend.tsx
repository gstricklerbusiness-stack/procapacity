"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";

interface UtilizationTrendProps {
  data: { weekStart: string; avgUtilization: number }[];
  warningThreshold: number;
  criticalThreshold: number;
}

export function UtilizationTrend({
  data,
  warningThreshold,
  criticalThreshold,
}: UtilizationTrendProps) {
  const chartData = data.map((d) => ({
    week: format(new Date(d.weekStart), "MMM d"),
    utilization: Math.round(d.avgUtilization * 100),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Utilization Trend (Past 8 Weeks)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="utilizationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                domain={[0, "auto"]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number | undefined) =>
                  value ? `${value}%` : "0%"
                }
              />
              <ReferenceLine
                y={Math.round(warningThreshold * 100)}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `Warning ${Math.round(warningThreshold * 100)}%`,
                  position: "right",
                  fill: "#f59e0b",
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                y={Math.round(criticalThreshold * 100)}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{
                  value: `Critical ${Math.round(criticalThreshold * 100)}%`,
                  position: "right",
                  fill: "#ef4444",
                  fontSize: 10,
                }}
              />
              <Area
                type="monotone"
                dataKey="utilization"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#utilizationGradient)"
                dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#10b981" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
