import { Badge } from "@/components/ui/badge";
import type { ResumeStatusValue } from "@/lib/resume-status";
import type { ApplicationStatusValue } from "@/lib/types";
import { Briefcase, Code, FileText, GraduationCap, Target } from "lucide-react";

type TrackerStatusPresentation = {
  /** The only user-visible spelling of this status. */
  label: string;
  /** Kanban column headings and "Move to" menu entries. */
  textClass: string;
  /** Badges on cards and dashboard rows. */
  badgeClass: string;
  /** Segments of the dashboard pipeline bar. */
  barClass: string;
};

/**
 * How every tracker status is presented, in one place.
 *
 * Stored status values are lowercase slugs (`screening`), so they must never
 * reach the DOM directly - read `label` from here instead. The three class
 * fields exist because a status gets drawn three different ways; they are kept
 * together so a new stage cannot be styled in one surface and forgotten in
 * another.
 */
export const TRACKER_STATUS_CONFIG: Record<
  ApplicationStatusValue,
  TrackerStatusPresentation
> = {
  saved: {
    label: "Saved",
    textClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
    barClass: "bg-muted",
  },
  applied: {
    label: "Applied",
    textClass: "text-blue-400",
    badgeClass: "bg-primary/10 text-primary",
    barClass: "bg-primary",
  },
  screening: {
    label: "Screening",
    textClass: "text-yellow-400",
    badgeClass: "bg-chart-4/10 text-chart-4",
    barClass: "bg-chart-4",
  },
  interview: {
    label: "Interview",
    textClass: "text-purple-400",
    badgeClass: "bg-chart-2/10 text-chart-2",
    barClass: "bg-chart-2",
  },
  offer: {
    label: "Offer",
    textClass: "text-green-400",
    badgeClass: "bg-success/10 text-success",
    barClass: "bg-success",
  },
  rejected: {
    label: "Rejected",
    textClass: "text-red-400",
    badgeClass: "bg-destructive/10 text-destructive",
    barClass: "bg-destructive",
  },
};

/**
 * Looks up presentation for a status that arrives as a plain string.
 *
 * `tracker_position.status` is a TEXT column, so rows read back from the
 * database are untyped here; falling back to `saved` keeps an unexpected value
 * rendering as a readable label rather than leaking the raw slug or crashing on
 * an undefined lookup.
 */
export const getTrackerStatusPresentation = (
  status: string,
): TrackerStatusPresentation =>
  TRACKER_STATUS_CONFIG[status as ApplicationStatusValue] ??
  TRACKER_STATUS_CONFIG.saved;

/**
 * Left-to-right order of the tracker kanban columns.
 *
 * Declared explicitly rather than derived from the config object so the board
 * layout is a deliberate choice, not a side effect of key ordering.
 */
export const KANBAN_COLUMN_ORDER = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
] as const satisfies readonly ApplicationStatusValue[];

/**
 * Stages shown in the dashboard pipeline bar.
 *
 * `rejected` is deliberately absent: the bar visualises forward progress, and
 * a rejection is an exit from the funnel rather than a step along it.
 */
export const PIPELINE_STAGE_ORDER = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
] as const satisfies readonly ApplicationStatusValue[];

/**
 * Suggestions offered under the "Target Role" field on upload.
 *
 * The field is free text: the product analyses a resume against whatever role
 * the person is actually aiming at, and the old fixed dropdown forced an
 * accountant or a marketer to pick "Other" - which then reached the prompt as
 * the literal word "other" and had the model score the resume against a role
 * called "other". These are a shortcut for the common cases, not the allowed
 * set.
 */
export const TARGET_ROLE_SUGGESTIONS = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Engineer",
  "Product Manager",
  "UX Designer",
  "DevOps Engineer",
] as const;

/**
 * Labels for `resume.status`. The stored values are `ResumeStatus` enum members
 * - shouted constants that are unfit to render as-is.
 */
export const RESUME_STATUS_LABELS: Record<ResumeStatusValue, string> = {
  DRAFT: "Draft",
  ANALYZED: "Analyzed",
};

/**
 * Order of the resume list's status filter, analysed first because that is the
 * list users reach for. Declared separately from the label map so the filter
 * order does not depend on object key order.
 */
export const RESUME_STATUS_FILTER_ORDER = [
  "ANALYZED",
  "DRAFT",
] as const satisfies readonly ResumeStatusValue[];

/**
 * Resolves a resume status to its label.
 */
export const getResumeStatusLabel = (status: ResumeStatusValue) =>
  RESUME_STATUS_LABELS[status];

/**
 * Maps importance level to Tailwind CSS class names for styling.
 * @param importance - Importance level ('critical', 'high', or default)
 * @returns Tailwind class string for styling the importance indicator
 */
export const getImportanceStyles = (importance: string) => {
  const imp = importance?.toLowerCase();
  if (imp === "critical")
    return "border-red-500/30 text-red-500 bg-transparent";
  if (imp === "high")
    return "border-yellow-500/30 text-yellow-500 bg-transparent";
  return "border-muted text-muted-foreground bg-transparent";
};

/**
 * Renders the badge for a resume's status.
 *
 * The column is a `ResumeStatus` enum, so both states are known here and every
 * resume gets a label - draft rows used to render no badge at all whenever the
 * lookup missed.
 * @param status - The stored `resume.status` value
 * @returns JSX Badge showing the human-readable label
 */
export function getStatusBadge(status: ResumeStatusValue) {
  const isAnalyzed = status === "ANALYZED";
  return (
    <Badge
      className={
        isAnalyzed
          ? "bg-primary/10 text-primary border-0"
          : "bg-muted text-muted-foreground border-0"
      }
    >
      {getResumeStatusLabel(status)}
    </Badge>
  );
}

export const getPriorityStyles = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "high":
    case "critical":
      return "border-red-500/30 text-red-500 bg-red-500/10";
    case "medium":
      return "border-yellow-500/30 text-yellow-500 bg-yellow-500/10";
    default:
      return "border-blue-500/30 text-blue-500 bg-blue-500/10";
  }
};

const priorityConfig = {
  high: {
    label: "High Impact",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  medium: {
    label: "Medium Impact",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  low: {
    label: "Low Impact",
    color: "bg-muted text-muted-foreground border-border",
  },
};

/**
 * Retrieves configuration object (label, color) for a given priority level.
 * @param priority - Priority level as string ('high', 'medium', 'low', or with suffix like 'High Impact')
 * @returns Configuration object with label and Tailwind color classes
 */
export const getPriorityConfig = (priority: unknown) => {
  if (typeof priority === "string") {
    const normalized = priority.toLowerCase().split(" ")[0]; // Get the first word (e.g., "high" from "High Impact")
    if (normalized in priorityConfig) {
      return priorityConfig[normalized as keyof typeof priorityConfig];
    }
  }
  return priorityConfig.low;
};

const categoryConfig = {
  content: {
    icon: FileText,
    label: "Content",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  skills: {
    icon: Code,
    label: "Skills",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  experience: {
    icon: Briefcase,
    label: "Experience",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  format: {
    icon: Target,
    label: "Format",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  keywords: {
    icon: GraduationCap,
    label: "Keywords",
    color: "bg-primary/20 text-primary border-primary/30",
  },
};

/**
 * Retrieves configuration object (icon, label, color) for a given category.
 * @param category - Category name as string ('content', 'skills', 'experience', 'format', 'keywords', or other)
 * @returns Configuration object with icon, label, and Tailwind color classes
 */
export const getCategoryConfig = (category: unknown) => {
  if (typeof category === "string") {
    const normalized = category.toLowerCase();

    if (normalized in categoryConfig) {
      return categoryConfig[normalized as keyof typeof categoryConfig];
    }
  }
  return categoryConfig.content;
};
