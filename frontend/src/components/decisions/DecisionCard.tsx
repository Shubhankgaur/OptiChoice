import { Link } from "@tanstack/react-router";
import { ChevronRight, Trophy } from "lucide-react";
import { StatusBadge } from "@/components/ui/states";
import type { Decision } from "@/types/decision";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** One row in a decision list. Winner/score come straight from backend ranking data. */
export function DecisionRow({ decision }: { decision: Decision }) {
  const winner = decision.ranking?.find((r) => r.rank === 1);
  return (
    <li className="group flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-accent/60 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{decision.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{fmt(decision.updatedAt)}</p>
      </div>
      <div className="flex items-center gap-4 text-sm sm:w-64">
        {winner ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{winner.alternativeName}</span>
            <span className="tabular text-muted-foreground">{winner.score}%</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Not evaluated yet</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 sm:w-36 sm:justify-end">
        <StatusBadge status={decision.status} />
        <Link
          to={decision.status === "draft" ? "/decisions/workspace" : "/history"}
          className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label={`View ${decision.title}`}
        >
          View <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </li>
  );
}
