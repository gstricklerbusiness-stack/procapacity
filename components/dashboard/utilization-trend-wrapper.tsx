"use client";

import dynamic from "next/dynamic";

const UtilizationTrend = dynamic(
  () => import("@/components/dashboard/utilization-trend").then((mod) => mod.UtilizationTrend),
  { ssr: false }
);

interface UtilizationTrendWrapperProps {
  data: { weekStart: string; avgUtilization: number }[];
  warningThreshold: number;
  criticalThreshold: number;
}

export default function UtilizationTrendWrapper({
  data,
  warningThreshold,
  criticalThreshold,
}: UtilizationTrendWrapperProps) {
  return (
    <UtilizationTrend
      data={data}
      warningThreshold={warningThreshold}
      criticalThreshold={criticalThreshold}
    />
  );
}
