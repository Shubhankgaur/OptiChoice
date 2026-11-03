import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarClock, Layers3, Plus, Trophy, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { PageBody } from "@/components/layout/AppLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { decisionService, type DecisionExplanation } from "@/services/decisionService";
import { DeleteSavedItemButton } from "@/components/decisions/DeleteSavedItemButton";
import { ExecutiveReport } from "@/components/decisions/ExecutiveReport";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

function HistoryItemReport({ decisionId, title, description, winnerName, winnerScore, ranking, criteria }: {
  decisionId: string;
  title: string;
  description?: string | undefined;
  winnerName?: string | undefined;
  winnerScore?: number | undefined;
  ranking?: any;
  criteria?: any;
}) {
  const [explanation, setExplanation] = useState<DecisionExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const toggleReport = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    if (!explanation) {
      setLoading(true);
      try {
        const exp = await decisionService.getExplanation(decisionId);
        setExplanation(exp);
      } catch (err) {
        console.error("Failed to load explanation:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="mt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleReport}
        className="gap-1.5 text-xs font-medium text-primary hover:bg-primary-soft hover:text-primary"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {isOpen ? "Hide AI Report" : "View AI Executive Report"}
      </Button>

      {isOpen && (
        <div className="mt-2">
          {loading && (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Generating Executive Report...
            </div>
          )}
          {explanation && (
            <ExecutiveReport
              decisionTitle={title}
              decisionDescription={description}
              explanation={explanation}
              winnerName={winnerName}
              winnerScore={winnerScore}
              ranking={ranking}
              criteria={criteria}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function History() {
  const { user } = useAuth();
  const history = useQuery({ queryKey: ["saved-history", user?.id], queryFn: decisionService.history, enabled: !!user });

  return (
    <>
      <Header title="History" />
      <PageBody>
        <div className="mx-auto max-w-5xl fade-in-up">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">YOUR PAST EVALUATIONS</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Decision history</h1>
              <p className="mt-2 text-muted-foreground">Your completed comparisons are saved here so you can revisit their results.</p>
            </div>
            <Button asChild className="rounded-xl">
              <Link to="/decisions/new"><Plus className="h-4 w-4" /> New decision</Link>
            </Button>
          </div>

          {history.isLoading ? <LoadingState label="Loading saved evaluations…" />
            : history.isError ? <ErrorState message="We couldn't load saved evaluations." onRetry={() => history.refetch()} />
              : !history.data?.length ? <EmptyState icon={<Layers3 className="h-6 w-6" />} title="No saved evaluations yet" description="When you evaluate a decision, its options, priorities, ratings and results will appear here." action={<Button asChild><Link to="/decisions/new"><Plus className="h-4 w-4" /> Start a decision</Link></Button>} />
                : <div className="space-y-3">
                  {history.data.map((decision) => {
                    const winner = decision.ranking?.[0];
                    return (
                      <article key={decision.id} className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div className="min-w-0">
                            <h2 className="truncate text-lg font-semibold tracking-tight">{decision.title}</h2>
                            {decision.description && <p className="mt-1 text-sm text-muted-foreground">{decision.description}</p>}
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" />{new Date(decision.createdAt).toLocaleString()}</span>
                              <span>{decision.alternatives.length} options</span>
                              <span>{decision.criteria.length} priorities</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                            {winner && <div className="flex items-center gap-3 rounded-xl bg-primary-soft/65 px-4 py-3">
                              <Trophy className="h-4 w-4 text-primary" />
                              <div><p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Best fit</p><p className="font-medium">{winner.alternativeName}<span className="ml-2 text-sm text-muted-foreground">{winner.score} / 100</span></p></div>
                            </div>}
                            <DeleteSavedItemButton id={decision.id} title={decision.title} kind="evaluation" />
                          </div>
                        </div>
                        <details className="mt-4 border-t pt-3">
                          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">View saved ranking and score breakdown</summary>
                          <div className="mt-3 space-y-2">
                            {decision.scoringMode === "relative" && <p className="text-xs leading-5 text-muted-foreground">Entered values were converted to 0–100 scores relative to the other options, based on whether higher or lower is better.</p>}
                            {decision.ranking?.map((item) => {
                              const breakdown = decision.breakdown.find((entry) => entry.alternativeId === item.alternativeId);
                              return <div key={item.alternativeId} className="rounded-lg bg-background px-3 py-2.5">
                                <div className="flex items-center justify-between gap-3 text-sm"><span><span className="mr-2 text-muted-foreground">{item.rank}.</span>{item.alternativeName}</span><span className="tabular font-semibold">{item.score} / 100</span></div>
                                <ul className="mt-2 grid gap-x-5 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">{breakdown?.contributions.map((contribution) => <li key={contribution.criterionId} className="flex justify-between gap-2"><span className="truncate">{contribution.criterionName}{decision.scoringMode === "relative" && contribution.inputValue !== undefined ? ` · ${contribution.inputValue}${contribution.unit ? ` ${contribution.unit}` : ""} → ${contribution.normalizedValue}/100` : ""}</span><span className="shrink-0 tabular">+{contribution.value.toFixed(2)} pts</span></li>)}</ul>
                              </div>;
                            })}
                          </div>
                        </details>
                        <HistoryItemReport
                          decisionId={decision.id}
                          title={decision.title}
                          description={decision.description}
                          winnerName={winner?.alternativeName}
                          winnerScore={winner?.score}
                          ranking={decision.ranking}
                          criteria={decision.criteria}
                        />
                        <div className="mt-4 flex justify-end border-t pt-3">
                          <Link to="/decisions/new" className="inline-flex items-center gap-1 text-sm font-medium text-primary">Start another <ArrowUpRight className="h-4 w-4" /></Link>
                        </div>
                      </article>
                    );
                  })}
                </div>}
        </div>
      </PageBody>
    </>
  );
}
