"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface DraggableAssignmentProps {
  id: string;
  assignmentId: string;
  projectName: string;
  projectColor: string;
  hoursPerWeek: number;
  children?: React.ReactNode;
}

export function DraggableAssignment({
  id,
  assignmentId,
  projectName,
  projectColor,
  hoursPerWeek,
  children,
}: DraggableAssignmentProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: {
      assignmentId,
      projectName,
      projectColor,
      hoursPerWeek,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children || (
        <div
          className="w-full text-[9px] px-1 py-0.5 rounded truncate text-center font-medium transition-shadow hover:shadow-md"
          style={{
            backgroundColor: `${projectColor}20`,
            color: projectColor,
          }}
        >
          {projectName.length > 6 ? projectName.substring(0, 6) : projectName}{" "}
          {hoursPerWeek}h
        </div>
      )}
    </div>
  );
}
