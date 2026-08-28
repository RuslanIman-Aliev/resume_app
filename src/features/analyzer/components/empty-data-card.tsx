import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

type EmptyDataCardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  /** Optional call to action rendered under the description. */
  action?: {
    label: string;
    href: string;
    icon?: ReactNode;
  };
};

export const EmptyDataCard = ({
  title,
  description,
  icon,
  action,
}: EmptyDataCardProps) => {
  return (
    <Card className="border-border/60 bg-card/60 mt-4 border-dashed w-full">
      <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center text-center">
        <div className="bg-muted/50 rounded-full p-4 mb-4">
          {icon || <Check className="h-8 w-8 text-muted-foreground/50" />}
        </div>
        <h2 className="text-xl font-semibold tracking-tight pb-2">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        {action ? (
          <Button asChild className="mt-6 min-h-11 sm:min-h-9">
            <Link href={action.href}>
              {action.icon}
              {action.label}
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
};
