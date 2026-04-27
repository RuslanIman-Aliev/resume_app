import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type FeedbackStateAction = {
  label: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  isLoading?: boolean;
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "ghost"
    | "link"
    | "destructive";
};

type FeedbackStateProps = {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  primaryAction?: FeedbackStateAction;
  secondaryAction?: FeedbackStateAction;
  extra?: ReactNode; // For badges or other custom elements
  layout?: "card" | "inline";
  status?: "default" | "error";
  className?: string;
};

export const FeedbackState = ({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  extra,
  layout = "card",
  status = "default",
  className,
}: FeedbackStateProps) => {
  const isCard = layout === "card";
  const isError = status === "error";

  const cardClasses = cn(
    "relative overflow-hidden rounded-2xl border p-10",
    isError
      ? "border-destructive/40 bg-linear-to-br from-destructive/10 via-card to-secondary/40"
      : "border-primary/35 bg-linear-to-br from-primary/10 via-card to-chart-2/10",
    className,
  );

  const inlineClasses = cn(
    "flex flex-col items-center justify-center py-8 text-center",
    className,
  );

  return (
    <div className={isCard ? cardClasses : inlineClasses}>
      {isCard && isError && (
        <div className="pointer-events-none absolute -top-16 left-8 h-44 w-44 rounded-full bg-destructive/20 blur-3xl" />
      )}
      {isCard && !isError && (
        <>
          <div className="pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute right-6 bottom-2 h-40 w-40 rounded-full bg-chart-2/20 blur-3xl" />
        </>
      )}

      <div
        className={cn(
          "relative flex flex-col items-center justify-center flex-1 text-center",
          isCard ? "min-h-56 gap-5" : "gap-3",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center",
            isCard
              ? "h-16 w-16 rounded-2xl border shadow-lg"
              : "h-12 w-12 rounded-full border",
            isError
              ? cn(
                  isCard
                    ? "border-destructive/50 bg-destructive/15 shadow-destructive/20"
                    : "border-destructive/40 bg-destructive/10",
                )
              : cn(
                  isCard
                    ? "border-primary/40 bg-primary/15 shadow-primary/20"
                    : "border-primary/30 bg-primary/10",
                ),
          )}
        >
          {icon}
        </div>

        <div>
          <p
            className={cn(
              "font-semibold",
              isCard ? "text-xl tracking-tight" : "text-base",
            )}
          >
            {title}
          </p>
          {description && (
            <p
              className={cn(
                "mt-1 text-sm text-muted-foreground",
                isCard && "max-w-md",
              )}
            >
              {description}
            </p>
          )}
        </div>

        {extra}

        {(primaryAction || secondaryAction) && (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
            {primaryAction && (
              <Button
                variant={primaryAction.variant || "default"}
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled || primaryAction.isLoading}
                className="gap-2"
              >
                {primaryAction.icon}
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant={secondaryAction.variant || "secondary"}
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled || secondaryAction.isLoading}
                className="gap-2"
              >
                {secondaryAction.icon}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
