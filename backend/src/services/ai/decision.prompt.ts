export interface DecisionContext {
  title: string;
  description?: string;
  scoringMode: "rating" | "relative";
  ranking: Array<{
    rank: number;
    alternativeName: string;
    score: number;
  }>;
  criteria: Array<{
    name: string;
    type: "benefit" | "cost";
    weight: number;
    unit?: string;
  }>;
  breakdown: Array<{
    alternativeId: string;
    contributions: Array<{
      criterionName: string;
      value: number;
      inputValue?: number;
      normalizedValue?: number;
      unit?: string;
    }>;
  }>;
}

/**
 * Builds a strict prompt for the AI explanation layer.
 * Rule: The model must explain strengths and trade-offs without altering scores or inventing data.
 */
export function buildDecisionExplanationPrompt(context: DecisionContext): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an analytical decision assistant for OptiChoice.
Your role is to explain a deterministically calculated decision ranking.

STRICT CONTRACT:
1. NEVER alter, reorder, or dispute the calculated ranking or scores.
2. The winner and ranking are mathematically final based on the user's criteria, weights, and values.
3. Your job is solely to summarize the trade-offs: why the top option won, what strengths it has, and what compromises or sacrifices were made relative to other options.
4. Keep explanations clear, balanced, and objective without hyperbole.
5. Provide response in structured JSON with fields:
   - "summary": A 2-3 sentence overview of the outcome.
   - "winnerRationale": Why the #1 ranked alternative scored highest based on the criteria weights.
   - "tradeOffs": Key trade-offs between the alternatives.
   - "caveats": Any notable assumptions (e.g. sensitivity to specific weights or tied scores).`;

  const rankingText = context.ranking
    .map((r) => `#${r.rank}: ${r.alternativeName} (Final Score: ${r.score}%)`)
    .join("\n");

  const criteriaText = context.criteria
    .map((c) => `- ${c.name} (Weight: ${c.weight}%, Type: ${c.type}${c.unit ? `, Unit: ${c.unit}` : ""})`)
    .join("\n");

  const userPrompt = `Decision: ${context.title}
${context.description ? `Description: ${context.description}\n` : ""}
Scoring Mode: ${context.scoringMode}

Rankings:
${rankingText}

Criteria & Priorities:
${criteriaText}

Please provide an objective explanation of this result according to the JSON schema.`;

  return { systemPrompt, userPrompt };
}

