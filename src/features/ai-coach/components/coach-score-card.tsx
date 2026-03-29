interface CategoryScoreCardProps {
  icon: React.ElementType;
  title: string;
  score: number;
  description: string;
}

export function CoachScoreCard({
  icon: Icon,
  title,
  score,
  description,
}: CategoryScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-primary";
    if (s >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getProgressColor = (s: number) => {
    if (s >= 80) return "bg-primary";
    if (s >= 60) return "bg-yellow-400";
    return "bg-red-400";
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
          {score}
        </span>
      </div>
      <h4 className="font-medium mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getProgressColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
