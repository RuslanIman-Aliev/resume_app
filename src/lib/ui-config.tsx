import { Badge } from "@/components/ui/badge";
import { Briefcase, Code, FileText, GraduationCap, Target } from "lucide-react";

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
 * Returns a styled Badge component based on the status string.
 * @param status - The status value ('tailored', 'ANALYZED', 'reviewed', or other)
 * @returns JSX Badge component with appropriate styling or null
 */
export function getStatusBadge(status: string) {
  switch (status) {
    case "tailored":
      return (
        <Badge className="bg-success/10 text-success border-0">
          Resume Tailored
        </Badge>
      );
    case "ANALYZED":
      return (
        <Badge className="bg-primary/10 text-primary border-0">Analyzed</Badge>
      );
    case "reviewed":
      return (
        <Badge className="bg-muted text-muted-foreground border-0">
          Reviewed
        </Badge>
      );
    default:
      return null;
  }
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
