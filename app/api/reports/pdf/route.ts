import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, eachWeekOfInterval, isWithinInterval, endOfWeek, format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const roleFilter = searchParams.get("role");

  if (!startDateParam || !endDateParam) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }

  const startDate = startOfWeek(new Date(startDateParam), { weekStartsOn: 1 });
  const endDate = startOfWeek(new Date(endDateParam), { weekStartsOn: 1 });

  const weeks = eachWeekOfInterval(
    { start: startDate, end: endDate },
    { weekStartsOn: 1 }
  );

  const teamMembers = await prisma.teamMember.findMany({
    where: {
      workspaceId: session.user.workspaceId,
      active: true,
      ...(roleFilter && roleFilter !== "all" ? { role: roleFilter } : {}),
    },
    include: {
      assignments: {
        where: {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
          project: { active: true },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Generate report data
  const rows: string[][] = [];
  let totalBillable = 0;
  let totalNonBillable = 0;
  let totalUtilization = 0;
  let rowCount = 0;

  for (const member of teamMembers) {
    for (const weekStart of weeks) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const overlapping = member.assignments.filter(
        (a: (typeof member.assignments)[number]) =>
          isWithinInterval(weekStart, { start: a.startDate, end: a.endDate }) ||
          isWithinInterval(a.startDate, { start: weekStart, end: weekEnd })
      );

      const billableHours = overlapping
        .filter((a: (typeof overlapping)[number]) => a.billable)
        .reduce((sum: number, a: (typeof overlapping)[number]) => sum + a.hoursPerWeek, 0);

      const nonBillableHours = overlapping
        .filter((a: (typeof overlapping)[number]) => !a.billable)
        .reduce((sum: number, a: (typeof overlapping)[number]) => sum + a.hoursPerWeek, 0);

      const total = billableHours + nonBillableHours;
      const util = member.defaultWeeklyCapacityHours > 0
        ? (total / member.defaultWeeklyCapacityHours) * 100
        : 0;

      totalBillable += billableHours;
      totalNonBillable += nonBillableHours;
      totalUtilization += util;
      rowCount++;

      rows.push([
        member.name,
        member.role,
        format(weekStart, "MMM d"),
        `${billableHours}h`,
        `${nonBillableHours}h`,
        `${total}h`,
        `${Math.round(util)}%`,
      ]);
    }
  }

  // Build PDF
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ProCapacity - Utilization Report", 14, 20);

  // Date range
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(
    `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`,
    14,
    28
  );
  doc.text(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`, 14, 33);

  // Summary stats
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Summary", 14, 44);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  const avgUtil = rowCount > 0 ? Math.round(totalUtilization / rowCount) : 0;
  doc.text(`Team Members: ${teamMembers.length}`, 14, 51);
  doc.text(`Average Utilization: ${avgUtil}%`, 70, 51);
  doc.text(`Total Billable Hours: ${Math.round(totalBillable)}h`, 130, 51);

  // Table
  autoTable(doc, {
    startY: 58,
    head: [["Name", "Role", "Week", "Billable", "Non-Billable", "Total", "Util %"]],
    body: rows,
    headStyles: {
      fillColor: [16, 185, 129], // emerald-500
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 20, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `ProCapacity | Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  const pdfBuffer = doc.output("arraybuffer");
  const fileName = `procapacity-report-${format(startDate, "yyyy-MM-dd")}-${format(endDate, "yyyy-MM-dd")}.pdf`;

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
