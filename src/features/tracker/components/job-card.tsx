import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  ChevronRight,
  DollarSign,
  ExternalLink,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const JobCard = ({ application }: { application: any }) => {
  return (
    <>
      <div className="group bg-card/80 border border-border/50 rounded-lg p-3 hover:border-primary/30 transition-colors cursor-grab active:cursor-grabbing">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold">
              {application.company.charAt(0)}
            </div>
            <div>
              <h4 className="font-medium text-sm leading-tight">
                {application.company}
              </h4>
              <p className="text-xs text-muted-foreground truncate max-w-35">
                {application.position}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {application.url && (
                <DropdownMenuItem asChild>
                  <a
                    href={application.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Job Posting
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-muted-foreground">
                Move to
                <ChevronRight className="h-4 w-4 ml-auto" />
              </DropdownMenuItem>
              {/* {nextStatuses.map((status) => (
              <DropdownMenuItem 
                key={status.id}
                onClick={() => onStatusChange(application.id, status.id)}
                className="pl-6"
              >
                <span className={status.color}>{status.label}</span>
              </DropdownMenuItem>
            ))} */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                // onClick={() => onDelete(application.id)}
                className="text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{application.location}</span>
          </div>
          {application.salary && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" />
              <span>{application.salary}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
          {application.matchScore && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Match:</span>
              <span className={`text-xs font-medium `}>
                {application.matchScore}%
              </span>
            </div>
          )}
          {application.appliedDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(application.appliedDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        {application.nextStep && (
          <div className="mt-2 p-2 bg-primary/10 rounded-md">
            <p className="text-xs text-primary font-medium">
              {application.nextStep}
            </p>
            {application.nextStepDate && (
              <p className="text-xs text-primary/70">
                {new Date(application.nextStepDate).toLocaleDateString(
                  "en-US",
                  { weekday: "short", month: "short", day: "numeric" },
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
};
