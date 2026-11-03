import { ExplanationService } from "../../../ai/src/services/explanation.service.js";
import type { DecisionContext } from "../../../ai/src/prompts/decision.prompt.js";
import type { DecisionExplanation } from "../../../ai/src/validation/explanation.schema.js";

const explanationService = new ExplanationService();

export async function generateDecisionExplanation(context: DecisionContext): Promise<DecisionExplanation> {
  return explanationService.explainDecision(context);
}

export type { DecisionContext, DecisionExplanation };

