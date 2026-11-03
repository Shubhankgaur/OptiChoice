import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Loader2, Pencil, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/layout/Header";
import { PageBody } from "@/components/layout/AppLayout";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { AlternativeList } from "@/components/alternatives/AlternativeList";
import { CriteriaTable } from "@/components/criteria/CriteriaTable";
import { WeightEditor } from "@/components/criteria/WeightEditor";
import { RatingMatrix, isValidValue } from "@/components/decisions/RatingMatrix";
import { WhatIfAnalysis } from "@/components/decisions/WhatIfAnalysis";
import { ExecutiveReport } from "@/components/decisions/ExecutiveReport";
import { useDecision, type DecisionDraft } from "@/hooks/useDecision";
import { decisionService, type EvaluateResponse, type DecisionExplanation } from "@/services/decisionService";

const STEPS = ["Decision", "Alternatives", "Criteria", "Weights", "Values", "Review"];

function stepError(i: number, d: DecisionDraft): string | null {
  switch (i) {
    case 0: return d.title.trim() ? null : "Give your decision a title.";
    case 1:
      if (d.alternatives.length < 2) return "Add at least 2 options to compare.";
      return d.alternatives.some((a) => !a.name.trim()) ? "Every option needs a name." : null;
    case 2:
      if (d.criteria.length < 1) return "Add at least 1 criterion.";
      return d.criteria.some((c) => !c.name.trim()) ? "Every criterion needs a name." : null;
    case 3: return d.criteria.reduce((s, c) => s + c.weight, 0) === 100 ? null : "Weights must add up to 100%.";
    case 4: {
      const missing = d.alternatives.some((a) => d.criteria.some((c) => !isValidValue(d.ratings[a.id]?.[c.id], d.scoringMode)));
      return missing ? d.scoringMode === "relative" ? "Enter a number for every option and criterion." : "Fill in every cell with a value from 0 to 100." : null;
    }
    default: return null;
  }
}

function StepHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function ReviewBlock({ label, step, onEdit, children }: { label: string; step: number; onEdit: (i: number) => void; children: ReactNode }) {
  return (
    <section className="border-b py-5 last:border-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
        <button onClick={() => onEdit(step)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>
      {children}
    </section>
  );
}

export default function DecisionWorkspace() {
  const api = useDecision();
  const { draft } = api;
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [editingInfo, setEditingInfo] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [explanation, setExplanation] = useState<DecisionExplanation | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  useEffect(() => {
    if (!api.ready) return;
    const savedStep = api.draft.currentStep ?? 0;
    setStep(savedStep);
    setMaxReached(Math.max(savedStep, api.draft.maxReached ?? 0));
  }, [api.ready, api.draft.currentStep, api.draft.maxReached]);

  if (!api.ready) return <LoadingState />;

  if (!draft.title && step === 0 && !editingInfo) {
    return (
      <>
        <Header title="Decision workspace" />
        <PageBody>
          <EmptyState title="No decision in progress" description="Start a new decision to open the workspace." action={<Button asChild><Link to="/decisions/new">New decision</Link></Button>} />
        </PageBody>
      </>
    );
  }

  const error = stepError(step, draft);
  const go = (i: number) => {
    setStep(i);
    const nextMaxReached = Math.max(maxReached, i);
    setMaxReached(nextMaxReached);
    api.update({ currentStep: i, maxReached: nextMaxReached });
    window.scrollTo({ top: 0 });
  };

  async function evaluate() {
    setStatus("loading");
    try {
      const res = await decisionService.evaluate({
        ...(draft.id ? { draftId: draft.id } : {}),
        title: draft.title,
        description: draft.description,
        scoringMode: draft.scoringMode,
        alternatives: draft.alternatives,
        criteria: draft.criteria,
        ratings: draft.alternatives.flatMap((a) => draft.criteria.map((c) => ({ alternativeId: a.id, criterionId: c.id, value: Number(draft.ratings[a.id]?.[c.id]) }))),
      });
      api.completeDraft();
      setResult(res);
      setStatus("idle");

      setExplanationLoading(true);
      try {
        const exp = await decisionService.getExplanation(res.decisionId);
        setExplanation(exp);
      } catch (err) {
        console.warn("Could not load AI explanation:", err);
      } finally {
        setExplanationLoading(false);
      }
    } catch {
      setStatus("error");
    }
  }

  async function refreshProductDetails(alternative: DecisionDraft["alternatives"][number], detail: "battery" | "weight" | "performance") {
    const productId = alternative.productInfo?.productId;
    if (!productId) return false;
    const specs = await decisionService.getProductSpecifications(productId, alternative.name);
    api.updateProductSpecifications(alternative.id, specs);
    if (detail === "battery") return specs.batteryHours !== null;
    if (detail === "weight") return specs.weightKg !== null;
    return specs.performanceScore !== null;
  }

  return (
    <>
      <Header title={draft.title || "Decision workspace"} />
      <PageBody>
        <StepIndicator steps={STEPS} current={step} maxReached={maxReached} onSelect={go} />
        {draft.title && api.syncStatus !== "idle" && <p className="mt-3 text-right text-xs text-muted-foreground" role="status">
          {api.syncStatus === "saving" ? "Saving your draft…" : api.syncStatus === "saved" ? "Draft saved" : "Draft could not save. Changes will retry after your next edit."}
        </p>}

        <div key={step} className="mt-5 max-w-4xl fade-in-up">
          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
          {step === 0 && (
            <>
              <StepHeading title="Your decision" hint="Make sure this describes what you're choosing between." />
              {editingInfo ? (
                <div className="space-y-4 rounded-lg border bg-card p-5">
                  <Input aria-label="Decision title" value={draft.title} onChange={(e) => api.update({ title: e.target.value })} />
                  <Textarea aria-label="Description" rows={3} value={draft.description} onChange={(e) => api.update({ description: e.target.value })} />
                  <Button size="sm" variant="outline" onClick={() => setEditingInfo(false)} disabled={!draft.title.trim()}>Done</Button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-5">
                  <div>
                    <p className="text-lg font-medium">{draft.title}</p>
                    {draft.description && <p className="mt-1 text-sm text-muted-foreground">{draft.description}</p>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setEditingInfo(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <StepHeading title="What are your options?" hint="List the alternatives you're comparing. You need at least two." />
              <AlternativeList items={draft.alternatives} onAdd={api.addAlternative} onAddProduct={api.addProductAlternative} onRename={api.renameAlternative} onRemove={api.removeAlternative} />
            </>
          )}

          {step === 2 && (
            <>
              <StepHeading title="What matters to you?" hint="Add the criteria you'll judge each option by, and whether higher or lower is better." />
              <CriteriaTable items={draft.criteria} scoringMode={draft.scoringMode} onAdd={api.addCriterion} onUpdate={api.updateCriterion} onRemove={api.removeCriterion} />
            </>
          )}

          {step === 3 && (
            <>
              <StepHeading title="How important is each criterion?" hint="Distribute 100% across your criteria. More weight means it matters more." />
              <WeightEditor
                items={draft.criteria}
                onChange={(id, w) => api.updateCriterion(id, { weight: w })}
                onSplitEvenly={() => {
                  const n = draft.criteria.length;
                  const base = Math.floor(100 / n);
                  api.update({ criteria: draft.criteria.map((c, i) => ({ ...c, weight: base + (i < 100 - base * n ? 1 : 0) })) });
                }}
              />
            </>
          )}

          {step === 4 && (
            <>
              <StepHeading
                title={draft.scoringMode === "relative" ? "Enter each option’s value" : "Rate each option"}
                hint={draft.scoringMode === "relative" ? "Enter the real value for each criterion. OptiChoice will scale options from 0–100 using your higher-or-lower preference." : "This saved draft uses the earlier 0–100 rating method. Higher ratings always mean better."}
              />
              <RatingMatrix alternatives={draft.alternatives} criteria={draft.criteria} ratings={draft.ratings} scoringMode={draft.scoringMode} onChange={api.setRating} onRefreshProduct={refreshProductDetails} />
              {draft.scoringMode === "relative" && <p className="mt-3 text-xs leading-5 text-muted-foreground">Scores compare the options in this decision. If every option has the same value for a criterion, they receive the same normalized score.</p>}
            </>
          )}

          {step === 5 && (
            <>
              <StepHeading title="Review your decision" hint="Check everything below, then send it for evaluation." />
              {result ? (
                <div className="rounded-lg border bg-card p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Best fit for your priorities</p>
                  <div className="mt-2 flex items-baseline gap-3">
                    <Trophy className="h-5 w-5 self-center text-primary" />
                    <p className="text-2xl font-semibold tracking-tight">{result.ranking[0]?.alternativeName}</p>
                    <p className="tabular text-lg text-muted-foreground">{result.ranking[0]?.score}<span className="ml-1 text-sm">/ 100</span></p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Scores combine {draft.scoringMode === "relative" ? "values normalized across your options" : "your ratings"} with the importance you assigned to each criterion. A higher score means a closer fit to your stated priorities.</p>
                  <ol className="mt-5 space-y-2">
                    {result.ranking.map((r) => (
                      <li key={r.alternativeId} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${r.rank === 1 ? "bg-primary-soft/65" : "bg-background"}`}>
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-card text-xs font-semibold text-muted-foreground">{r.rank}</span>
                        <span className="min-w-0 flex-1 truncate font-medium">{r.alternativeName}</span>
                        <span className="tabular font-semibold">{r.score}<span className="ml-1 text-xs font-normal text-muted-foreground">/ 100</span></span>
                      </li>
                    ))}
                  </ol>
                  <details className="mt-5 rounded-xl border bg-background">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium">See how each score was calculated</summary>
                    <div className="space-y-3 border-t p-4">
                      {result.ranking.map((r) => {
                        const detail = result.breakdown.find((item) => item.alternativeId === r.alternativeId);
                        return (
                          <div key={r.alternativeId} className="rounded-lg border bg-card p-3">
                            <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-medium">{r.alternativeName}</span><span className="tabular text-muted-foreground">{r.score} total</span></div>
                            <ul className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                              {detail?.contributions.map((contribution) => <li key={contribution.criterionId} className="flex justify-between gap-3"><span className="truncate">{contribution.criterionName}{draft.scoringMode === "relative" && contribution.inputValue !== undefined ? ` · ${contribution.inputValue}${contribution.unit ? ` ${contribution.unit}` : ""} → ${contribution.normalizedValue}/100` : ""}</span><span className="shrink-0 tabular">+{contribution.value.toFixed(2)} pts</span></li>)}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </details>

                  {explanationLoading && (
                    <div className="mt-5 rounded-2xl border bg-card p-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Synthesizing AI Executive Report...</span>
                    </div>
                  )}

                  {explanation && (
                    <ExecutiveReport
                      decisionTitle={draft.title}
                      decisionDescription={draft.description}
                      explanation={explanation}
                      winnerName={result.ranking[0]?.alternativeName}
                      winnerScore={result.ranking[0]?.score}
                      ranking={result.ranking}
                      criteria={draft.criteria}
                    />
                  )}

                  {draft.criteria.length > 1 && <WhatIfAnalysis
                    key={result.decisionId}
                    input={{
                      title: draft.title,
                      description: draft.description,
                      scoringMode: draft.scoringMode,
                      alternatives: draft.alternatives,
                      criteria: draft.criteria,
                      ratings: draft.alternatives.flatMap((alternative) => draft.criteria.map((criterion) => ({
                        alternativeId: alternative.id,
                        criterionId: criterion.id,
                        value: Number(draft.ratings[alternative.id]?.[criterion.id]),
                      }))),
                    }}
                    original={result}
                  />}
                </div>
              ) : (
                <div className="rounded-lg border bg-card px-5">
                  <ReviewBlock label="Decision" step={0} onEdit={go}>
                    <p className="font-medium">{draft.title}</p>
                    {draft.description && <p className="mt-0.5 text-sm text-muted-foreground">{draft.description}</p>}
                  </ReviewBlock>
                  <ReviewBlock label={`Alternatives (${draft.alternatives.length})`} step={1} onEdit={go}>
                    <div className="flex flex-wrap gap-1.5">{draft.alternatives.map((a) => <span key={a.id} className="rounded-md bg-secondary px-2 py-1 text-sm">{a.name}</span>)}</div>
                  </ReviewBlock>
                  <ReviewBlock label="Criteria & weights" step={3} onEdit={go}>
                    <ul className="space-y-2">
                      {draft.criteria.map((c) => (
                        <li key={c.id} className="flex items-center gap-3 text-sm">
                          <span className="w-32 truncate">{c.name}</span>
                          <span className="w-24 text-xs text-muted-foreground">{c.type === "cost" ? "Lower is better" : "Higher is better"}{draft.scoringMode === "relative" && c.unit ? ` · ${c.unit}` : ""}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-primary" style={{ width: `${c.weight}%` }} /></span>
                          <span className="w-10 text-right tabular">{c.weight}%</span>
                        </li>
                      ))}
                    </ul>
                  </ReviewBlock>
                  <ReviewBlock label={draft.scoringMode === "relative" ? "Values entered" : "Ratings"} step={4} onEdit={go}>
                    <RatingMatrix alternatives={draft.alternatives} criteria={draft.criteria} ratings={draft.ratings} scoringMode={draft.scoringMode} />
                  </ReviewBlock>
                </div>
              )}
              {status === "error" && <div className="mt-4"><ErrorState message="Evaluation failed. Please try again." onRetry={evaluate} /></div>}
            </>
          )}

          <div className="mt-8 flex items-center justify-between gap-4 border-t pt-5">
            <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0 || status === "loading"}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex items-center gap-3">
              {error && <p className="hidden text-sm text-muted-foreground sm:block">{error}</p>}
              {step < 5 ? (
                <Button onClick={() => go(step + 1)} disabled={!!error || editingInfo}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              ) : result ? (
                <Button asChild><Link to="/dashboard">Back to dashboard</Link></Button>
              ) : (
                <Button onClick={evaluate} disabled={status === "loading"}>
                  {status === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Evaluating…</> : "Evaluate decision"}
                </Button>
              )}
            </div>
          </div>
          {error && <p className="mt-2 text-right text-sm text-muted-foreground sm:hidden">{error}</p>}
          </div>
        </div>
      </PageBody>
    </>
  );
}
