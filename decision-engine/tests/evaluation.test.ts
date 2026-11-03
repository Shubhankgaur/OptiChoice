import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateDecision, type EvaluationInput } from "../src/index.ts";

describe("Decision Engine - evaluateDecision", () => {
  it("should throw an error if fewer than 2 alternatives are provided", () => {
    const input: EvaluationInput = {
      alternatives: [{ id: "a1", name: "Laptop A" }],
      criteria: [{ id: "c1", name: "Price", type: "cost", weight: 100 }],
      ratings: [{ alternativeId: "a1", criterionId: "c1", value: 50000 }],
      scoringMode: "relative",
    };
    assert.throws(() => evaluateDecision(input), /Add at least two alternatives/);
  });

  it("should throw an error if weights do not total 100", () => {
    const input: EvaluationInput = {
      alternatives: [
        { id: "a1", name: "Laptop A" },
        { id: "a2", name: "Laptop B" },
      ],
      criteria: [
        { id: "c1", name: "Price", type: "cost", weight: 60 },
        { id: "c2", name: "Battery", type: "benefit", weight: 30 },
      ],
      ratings: [
        { alternativeId: "a1", criterionId: "c1", value: 50000 },
        { alternativeId: "a1", criterionId: "c2", value: 10 },
        { alternativeId: "a2", criterionId: "c1", value: 60000 },
        { alternativeId: "a2", criterionId: "c2", value: 12 },
      ],
      scoringMode: "relative",
    };
    assert.throws(() => evaluateDecision(input), /Criterion weights must total 100/);
  });

  it("should correctly rank cost criteria (lower is better)", () => {
    const input: EvaluationInput = {
      alternatives: [
        { id: "a1", name: "Cheaper Option" },
        { id: "a2", name: "Expensive Option" },
      ],
      criteria: [{ id: "c1", name: "Price", type: "cost", weight: 100 }],
      ratings: [
        { alternativeId: "a1", criterionId: "c1", value: 40000 },
        { alternativeId: "a2", criterionId: "c1", value: 80000 },
      ],
      scoringMode: "relative",
    };
    const result = evaluateDecision(input);
    assert.equal(result.ranking[0].alternativeName, "Cheaper Option");
    assert.equal(result.ranking[0].score, 100);
    assert.equal(result.ranking[1].alternativeName, "Expensive Option");
    assert.equal(result.ranking[1].score, 0);
  });

  it("should correctly rank benefit criteria (higher is better)", () => {
    const input: EvaluationInput = {
      alternatives: [
        { id: "a1", name: "Low Battery" },
        { id: "a2", name: "High Battery" },
      ],
      criteria: [{ id: "c1", name: "Battery Hours", type: "benefit", weight: 100 }],
      ratings: [
        { alternativeId: "a1", criterionId: "c1", value: 6 },
        { alternativeId: "a2", criterionId: "c1", value: 12 },
      ],
      scoringMode: "relative",
    };
    const result = evaluateDecision(input);
    assert.equal(result.ranking[0].alternativeName, "High Battery");
    assert.equal(result.ranking[0].score, 100);
    assert.equal(result.ranking[1].alternativeName, "Low Battery");
    assert.equal(result.ranking[1].score, 0);
  });

  it("should give equal score 100 when all alternatives have identical values", () => {
    const input: EvaluationInput = {
      alternatives: [
        { id: "a1", name: "Option 1" },
        { id: "a2", name: "Option 2" },
      ],
      criteria: [{ id: "c1", name: "Warranty", type: "benefit", weight: 100 }],
      ratings: [
        { alternativeId: "a1", criterionId: "c1", value: 2 },
        { alternativeId: "a2", criterionId: "c1", value: 2 },
      ],
      scoringMode: "relative",
    };
    const result = evaluateDecision(input);
    assert.equal(result.ranking[0].score, 100);
    assert.equal(result.ranking[1].score, 100);
  });

  it("should preserve input order when exact scores tie", () => {
    const input: EvaluationInput = {
      alternatives: [
        { id: "a1", name: "First" },
        { id: "a2", name: "Second" },
      ],
      criteria: [{ id: "c1", name: "Identical", type: "benefit", weight: 100 }],
      ratings: [
        { alternativeId: "a1", criterionId: "c1", value: 10 },
        { alternativeId: "a2", criterionId: "c1", value: 10 },
      ],
      scoringMode: "relative",
    };
    const result = evaluateDecision(input);
    assert.equal(result.ranking[0].alternativeName, "First");
    assert.equal(result.ranking[1].alternativeName, "Second");
  });
});
