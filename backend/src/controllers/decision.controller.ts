import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { runEvaluation } from "../services/evaluation.service.js";
import { createDraft, deleteDecision, deleteDraft, getDecision, getDraft, listDecisions, listDrafts, saveDecision, updateDraft } from "../repositories/decision.repository.js";
import { generateDecisionExplanation, type DecisionContext } from "../services/ai.service.js";
import { draftSchema } from "../validation/draft.schema.js";
import { evaluationRequestSchema } from "../validation/evaluation.schema.js";
import { z } from "zod";

function currentUserId(request: Request, response: Response): string | null {
  if (!request.authUser) {
    response.status(401).json({ error: { code: "UNAUTHORIZED", message: "Please sign in to continue." } });
    return null;
  }
  return request.authUser.id;
}

export function evaluateDecisionController(request: Request, response: Response, next: NextFunction): void {
  const userId = currentUserId(request, response);
  if (!userId) return;
  const parsed = evaluationRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: {
        code: "INVALID_REQUEST",
        message: parsed.error.issues[0]?.message ?? "Check the decision details and try again.",
      },
    });
    return;
  }

  if (parsed.data.draftId && !getDraft(parsed.data.draftId, userId)) {
    response.status(404).json({ error: { code: "DRAFT_NOT_FOUND", message: "This draft may have been completed or removed." } });
    return;
  }

  let result;
  try {
    result = runEvaluation(parsed.data);
  } catch (error) {
    response.status(422).json({
      error: {
        code: "INVALID_DECISION",
        message: error instanceof Error ? error.message : "The decision could not be evaluated.",
      },
    });
    return;
  }

  const createdAt = new Date().toISOString();
  const decision = {
    id: randomUUID(),
    userId,
    ...parsed.data,
    status: "completed" as const,
    createdAt,
    updatedAt: createdAt,
    ...result,
  };
  try {
    saveDecision(decision, parsed.data.draftId);
  } catch (error) {
    next(error);
    return;
  }
  response.status(200).json({ decisionId: decision.id, createdAt, ...result });
}

export function listDecisionsController(_request: Request, response: Response): void {
  const userId = currentUserId(_request, response);
  if (!userId) return;
  response.status(200).json({ decisions: listDecisions(userId) });
}

export function deleteDecisionController(request: Request, response: Response): void {
  const userId = currentUserId(request, response);
  if (!userId) return;
  const id = z.uuid().safeParse(request.params["id"]);
  if (!id.success) {
    response.status(400).json({ error: { code: "INVALID_DECISION_ID", message: "That decision ID is not valid." } });
    return;
  }
  if (!deleteDecision(id.data, userId)) {
    response.status(404).json({ error: { code: "DECISION_NOT_FOUND", message: "That evaluation could not be found." } });
    return;
  }
  response.status(200).json({ deleted: true });
}

export function listDraftsController(_request: Request, response: Response): void {
  const userId = currentUserId(_request, response);
  if (!userId) return;
  response.status(200).json({ drafts: listDrafts(userId) });
}

export function deleteDraftController(request: Request, response: Response): void {
  const userId = currentUserId(request, response);
  if (!userId) return;
  const id = z.uuid().safeParse(request.params["id"]);
  if (!id.success) {
    response.status(400).json({ error: { code: "INVALID_DRAFT_ID", message: "That draft ID is not valid." } });
    return;
  }
  if (!deleteDraft(id.data, userId)) {
    response.status(404).json({ error: { code: "DRAFT_NOT_FOUND", message: "That draft could not be found." } });
    return;
  }
  response.status(200).json({ deleted: true });
}

export function createDraftController(request: Request, response: Response, next: NextFunction): void {
  const userId = currentUserId(request, response);
  if (!userId) return;
  const parsed = draftSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: "INVALID_DRAFT", message: parsed.error.issues[0]?.message ?? "Check the draft details and try again." } });
    return;
  }
  try {
    const createdAt = new Date().toISOString();
    const draft = createDraft(userId, randomUUID(), parsed.data, createdAt);
    response.status(201).json({ draft });
  } catch (error) {
    next(error);
  }
}

export function getDraftController(request: Request, response: Response): void {
  const userId = currentUserId(request, response);
  if (!userId) return;
  const id = z.uuid().safeParse(request.params["id"]);
  if (!id.success) {
    response.status(400).json({ error: { code: "INVALID_DRAFT_ID", message: "That draft ID is not valid." } });
    return;
  }
  const draft = getDraft(id.data, userId);
  if (!draft) {
    response.status(404).json({ error: { code: "DRAFT_NOT_FOUND", message: "This draft may have been completed or removed." } });
    return;
  }
  response.status(200).json({ draft });
}

export function updateDraftController(request: Request, response: Response, next: NextFunction): void {
  const userId = currentUserId(request, response);
  if (!userId) return;
  const id = z.uuid().safeParse(request.params["id"]);
  const parsed = draftSchema.safeParse(request.body);
  if (!id.success) {
    response.status(400).json({ error: { code: "INVALID_DRAFT_ID", message: "That draft ID is not valid." } });
    return;
  }
  if (!parsed.success) {
    response.status(400).json({ error: { code: "INVALID_DRAFT", message: parsed.error.issues[0]?.message ?? "Check the draft details and try again." } });
    return;
  }
  try {
    const draft = updateDraft(id.data, userId, parsed.data, new Date().toISOString());
    if (!draft) {
      response.status(404).json({ error: { code: "DRAFT_NOT_FOUND", message: "This draft may have been completed or removed." } });
      return;
    }
    response.status(200).json({ draft });
  } catch (error) {
    next(error);
  }
}

export async function explainDecisionController(request: Request, response: Response, next: NextFunction): Promise<void> {
  const userId = currentUserId(request, response);
  if (!userId) return;

  const decisionIdParam = typeof request.params["id"] === "string" ? request.params["id"] : undefined;

  try {
    let context: DecisionContext;

    if (decisionIdParam) {
      const decision = getDecision(decisionIdParam, userId);
      if (!decision) {
        response.status(404).json({ error: { code: "DECISION_NOT_FOUND", message: "Decision not found." } });
        return;
      }
      context = {
        title: decision.title,
        description: decision.description,
        scoringMode: decision.scoringMode ?? "rating",
        ranking: decision.ranking.map((r) => ({
          rank: r.rank,
          alternativeName: r.alternativeName,
          score: r.score,
        })),
        criteria: decision.criteria.map((c) => ({
          name: c.name,
          type: c.type,
          weight: c.weight,
          unit: c.unit,
        })),
        breakdown: decision.breakdown.map((b) => ({
          alternativeId: b.alternativeId,
          contributions: b.contributions.map((c) => ({
            criterionName: c.criterionName,
            value: c.value,
          })),
        })),
      };
    } else {
      // Body payload
      const body = request.body as DecisionContext;
      if (!body || !body.title || !Array.isArray(body.ranking) || !Array.isArray(body.criteria)) {
        response.status(400).json({ error: { code: "INVALID_CONTEXT", message: "Provide title, ranking, and criteria." } });
        return;
      }
      context = body;
    }

    const explanation = await generateDecisionExplanation(context);
    response.status(200).json({ explanation });
  } catch (error) {
    next(error);
  }
}
