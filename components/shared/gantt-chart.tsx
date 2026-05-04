"use client";

import { useMemo } from "react";
import type { Task } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

type GanttTask = {
  id: string;
  title: string;
  status: Task["status"];
  start: Date;
  end: Date;
};

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function diffDays(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / DAY_MS);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function formatTick(date: Date, mode: "day" | "week" | "month") {
  if (mode === "month") {
    return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const STATUS_STYLES: Record<Task["status"], string> = {
  TODO: "bg-slate-200 text-slate-700",
  IN_PROGRESS: "bg-blue-500 text-white",
  BLOCKED: "bg-rose-500 text-white",
  REVIEW: "bg-amber-400 text-amber-950",
  DONE: "bg-emerald-500 text-white",
};

export function GanttChart({
  tasks,
  className,
  onTaskClick,
}: {
  tasks: Task[];
  className?: string;
  onTaskClick?: (taskId: string) => void;
}) {
  const normalized = useMemo(() => {
    return tasks
      .map((task) => {
        const start = parseDate(task.startDate) ?? parseDate(task.dueDate) ?? parseDate(task.createdAt);
        const end = parseDate(task.dueDate) ?? parseDate(task.startDate) ?? parseDate(task.createdAt);
        if (!start || !end) return null;
        const safeStart = start.getTime() <= end.getTime() ? start : end;
        const safeEnd = end.getTime() >= start.getTime() ? end : start;
        return {
          id: task.id,
          title: task.title,
          status: task.status,
          start: safeStart,
          end: safeEnd,
        } satisfies GanttTask;
      })
      .filter((task): task is GanttTask => Boolean(task));
  }, [tasks]);

  const range = useMemo(() => {
    if (normalized.length === 0) return null;
    const start = normalized.reduce((min, t) => (t.start < min ? t.start : min), normalized[0].start);
    const end = normalized.reduce((max, t) => (t.end > max ? t.end : max), normalized[0].end);
    const totalDays = Math.max(1, diffDays(start, end) + 1);
    let mode: "day" | "week" | "month" = "day";
    let step = 1;
    if (totalDays > 21 && totalDays <= 120) {
      mode = "week";
      step = 7;
    } else if (totalDays > 120) {
      mode = "month";
      step = 30;
    }
    const ticks: Date[] = [];
    for (let i = 0; i <= totalDays; i += step) {
      ticks.push(addDays(start, i));
    }
    return { start, end, totalDays, mode, step, ticks };
  }, [normalized]);

  if (normalized.length === 0 || !range) {
    return (
      <div className={className}>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No task dates available for a timeline yet.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {range.start.toLocaleDateString()} - {range.end.toLocaleDateString()}
        </span>
        <span>{range.totalDays} days</span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[720px] space-y-3">
          <div className="grid grid-cols-[220px_1fr] items-center text-[11px] text-muted-foreground">
            <span>Task</span>
            <div className="flex items-center justify-between">
              {range.ticks.map((tick) => (
                <span key={tick.toISOString()}>{formatTick(tick, range.mode)}</span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {normalized.map((task) => {
              const startOffset = diffDays(range.start, task.start);
              const endOffset = diffDays(range.start, task.end);
              const leftPct = (startOffset / range.totalDays) * 100;
              const widthPct = Math.max(1, ((endOffset - startOffset + 1) / range.totalDays) * 100);
              return (
                <div key={task.id} className="grid grid-cols-[220px_1fr] items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onTaskClick?.(task.id)}
                    className="flex items-center gap-2 text-left"
                  >
                    <span className="line-clamp-1 text-sm font-medium">{task.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_STYLES[task.status]}`}>
                      {task.status.replace("_", " ")}
                    </span>
                  </button>
                  <div
                    className="relative h-9 rounded-md border bg-muted/40"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to right, rgba(148,163,184,0.35), rgba(148,163,184,0.35) 1px, transparent 1px, transparent calc(100% / 8))",
                    }}
                  >
                    <div
                      className={`absolute top-1/2 h-5 -translate-y-1/2 rounded-md ${STATUS_STYLES[task.status]} ${
                        onTaskClick ? "cursor-pointer hover:brightness-90 transition-all shadow-sm" : ""
                      }`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={`${task.title}: ${task.start.toLocaleDateString()} - ${task.end.toLocaleDateString()}`}
                      role={onTaskClick ? "button" : undefined}
                      tabIndex={onTaskClick ? 0 : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick?.(task.id);
                      }}
                      onKeyDown={(event) => {
                        if (!onTaskClick) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onTaskClick(task.id);
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
