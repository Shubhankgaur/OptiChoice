import { ExplanationService } from "./ai/explanation.service.js";
import type { DecisionContext } from "./ai/decision.prompt.js";
import type { DecisionExplanation } from "./ai/explanation.schema.js";

const explanationService = new ExplanationService();

export async function generateDecisionExplanation(context: DecisionContext): Promise<DecisionExplanation> {
  return explanationService.explainDecision(context);
}

export type { DecisionContext, DecisionExplanation };
