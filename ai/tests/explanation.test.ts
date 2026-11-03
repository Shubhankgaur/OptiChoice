import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ExplanationService } from "../src/services/explanation.service.ts";
import type { DecisionContext } from "../src/prompts/decision.prompt.ts";

describe("AI Explanation Layer", () => {
  it("should generate deterministic explanation without API key", async () => {
    const service = new ExplanationService();
    const context: DecisionContext = {
      title: "Best Laptop for College",
      scoringMode: "relative",
      ranking: [
        { rank: 1, alternativeName: "MacBook Air", score: 85.5 },
        { rank: 2, alternativeName: "Dell XPS", score: 72.3 },
      ],
      criteria: [
        { name: "Battery Life", type: "benefit", weight: 60, unit: "hours" },
        { name: "Price", type: "cost", weight: 40, unit: "INR" },
      ],
      breakdown: [],
    };

    const explanation = await service.explainDecision(context);

    assert.ok(explanation.summary.includes("MacBook Air"));
    assert.ok(explanation.winnerRationale.includes("Battery Life"));
    assert.equal(explanation.tradeOffs.length >= 1, true);
    assert.ok(explanation.caveats && explanation.caveats.length > 0);
  });
});

