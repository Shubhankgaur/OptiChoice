import { buildDecisionExplanationPrompt, type DecisionContext } from "./decision.prompt.js";
import { validateExplanation, type DecisionExplanation } from "./explanation.schema.js";

export class ExplanationService {
  private apiKey?: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.AI_API_KEY ?? process.env.GEMINI_API_KEY;
  }

  /**
   * Generates an analytical explanation for a decision result.
   * If an API key is provided, calls Gemini/LLM API.
   * Otherwise falls back to deterministic rule-based analysis.
   */
  async explainDecision(context: DecisionContext): Promise<DecisionExplanation> {
    if (this.apiKey) {
      try {
        return await this.callAiProvider(context);
      } catch (err) {
        console.warn("AI provider call failed, falling back to deterministic explanation:", err);
      }
    }

    return this.generateDeterministicExplanation(context);
  }

  private async callAiProvider(context: DecisionContext): Promise<DecisionExplanation> {
    const { systemPrompt, userPrompt } = buildDecisionExplanationPrompt(context);

    // Default to Gemini API if key is present
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`AI request failed with status: ${response.status}`);
    }

    const json = (await response.json()) as any;
    const textContent = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      throw new Error("Empty response from AI model");
    }

    const parsed = JSON.parse(textContent);
    return validateExplanation(parsed);
  }

  private generateDeterministicExplanation(context: DecisionContext): DecisionExplanation {
    const winner = context.ranking[0];
    const runnerUp = context.ranking[1];

    if (!winner) {
      return {
        summary: "No ranking available to explain.",
        winnerRationale: "No options evaluated.",
        tradeOffs: [],
      };
    }

    const topCriteria = [...context.criteria].sort((a, b) => b.weight - a.weight);
    const highestWeightCriterion = topCriteria[0];

    const summary = `${winner.alternativeName} finished in 1st place with an overall score of ${winner.score}%, ` +
      (runnerUp ? `ahead of ${runnerUp.alternativeName} (${runnerUp.score}%).` : "as the single evaluated option.");

    const winnerRationale = highestWeightCriterion
      ? `${winner.alternativeName} aligned best with your highest-priority criterion (${highestWeightCriterion.name}, weighted at ${highestWeightCriterion.weight}%), which heavily drove the final ranking.`
      : `${winner.alternativeName} achieved the highest aggregate performance across the evaluated criteria.`;

    const tradeOffs: string[] = [];
    if (runnerUp) {
      const pointDiff = Math.round((winner.score - runnerUp.score) * 100) / 100;
      tradeOffs.push(
        `Score margin: ${winner.alternativeName} leads ${runnerUp.alternativeName} by ${pointDiff} percentage points.`
      );
    }

    if (topCriteria.length > 1) {
      tradeOffs.push(
        `Top distinguishing factors: ${topCriteria.slice(0, 2).map((c) => `${c.name} (${c.weight}%)`).join(" and ")} had the largest influence on the overall calculation.`
      );
    }

    return {
      summary,
      winnerRationale,
      tradeOffs,
      caveats: [
        "This ranking is strictly relative to the alternatives entered and reflects your specific assigned weights.",
        "Changing weights in What-If mode may shift the leading option.",
      ],
    };
  }
}
