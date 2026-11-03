import { database } from "../database/database.js";
import type { EvaluationRequestBody } from "../validation/evaluation.schema.js";
import { draftSchema, type DraftBody } from "../validation/draft.schema.js";

export interface SavedDraft extends DraftBody {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedDecision {
  id: string;
  title: string;
  description: string;
  status: "completed";
  createdAt: string;
  updatedAt: string;
  alternatives: EvaluationRequestBody["alternatives"];
  criteria: EvaluationRequestBody["criteria"];
  scoringMode: EvaluationRequestBody["scoringMode"];
  ratings: EvaluationRequestBody["ratings"];
  ranking: { alternativeId: string; alternativeName: string; rank: number; score: number }[];
  breakdown: { alternativeId: string; contributions: { criterionId: string; criterionName: string; value: number }[] }[];
}

export function saveDecision(decision: SavedDecision & { userId: string }, draftId?: string): void {
  const insert = database.prepare(`
    INSERT INTO decisions (
      id, user_id, title, description, alternatives_json, criteria_json, ratings_json,
      ranking_json, breakdown_json, scoring_mode, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  database.exec("BEGIN IMMEDIATE");
  try {
    insert.run(
    decision.id,
    decision.userId,
    decision.title,
    decision.description,
    JSON.stringify(decision.alternatives),
    JSON.stringify(decision.criteria),
    JSON.stringify(decision.ratings),
    JSON.stringify(decision.ranking),
    JSON.stringify(decision.breakdown),
    decision.scoringMode,
    decision.createdAt,
    );
    if (draftId) {
      const removedDraft = database.prepare("DELETE FROM decision_drafts WHERE id = ? AND user_id = ?").run(draftId, decision.userId);
      if (removedDraft.changes === 0) throw new Error("The draft was not found for this user.");
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function listDecisions(userId: string): SavedDecision[] {
  const rows = database.prepare(`
    SELECT id, title, description, alternatives_json, criteria_json, ratings_json,
      ranking_json, breakdown_json, scoring_mode, created_at
    FROM decisions
    WHERE user_id = ?
    ORDER BY created_at DESC, rowid DESC
  `).all(userId);

  return rows.map((row) => {
    const saved = row as Record<string, string>;
    return {
      id: saved["id"]!,
      title: saved["title"]!,
      description: saved["description"]!,
      status: "completed",
      scoringMode: (saved["scoring_mode"] ?? "rating") as "rating" | "relative",
      createdAt: saved["created_at"]!,
      updatedAt: saved["created_at"]!,
      alternatives: JSON.parse(saved["alternatives_json"]!),
      criteria: JSON.parse(saved["criteria_json"]!),
      ratings: JSON.parse(saved["ratings_json"]!),
      ranking: JSON.parse(saved["ranking_json"]!),
      breakdown: JSON.parse(saved["breakdown_json"]!),
    };
  });
}

export function getDecision(id: string, userId: string): SavedDecision | null {
  const row = database.prepare(`
    SELECT id, title, description, alternatives_json, criteria_json, ratings_json,
      ranking_json, breakdown_json, scoring_mode, created_at
    FROM decisions
    WHERE id = ? AND user_id = ?
  `).get(id, userId);

  if (!row) return null;
  const saved = row as Record<string, string>;
  return {
    id: saved["id"]!,
    title: saved["title"]!,
    description: saved["description"]!,
    status: "completed",
    scoringMode: (saved["scoring_mode"] ?? "rating") as "rating" | "relative",
    createdAt: saved["created_at"]!,
    updatedAt: saved["created_at"]!,
    alternatives: JSON.parse(saved["alternatives_json"]!),
    criteria: JSON.parse(saved["criteria_json"]!),
    ratings: JSON.parse(saved["ratings_json"]!),
    ranking: JSON.parse(saved["ranking_json"]!),
    breakdown: JSON.parse(saved["breakdown_json"]!),
  };
}

export function deleteDecision(id: string, userId: string): boolean {
  return database.prepare("DELETE FROM decisions WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

export function createDraft(userId: string, id: string, draft: DraftBody, createdAt: string): SavedDraft {
  database.prepare(`
    INSERT INTO decision_drafts (id, user_id, title, description, draft_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, draft.title, draft.description, JSON.stringify(draft), createdAt, createdAt);
  return { id, ...draft, createdAt, updatedAt: createdAt };
}

export function updateDraft(id: string, userId: string, draft: DraftBody, updatedAt: string): SavedDraft | null {
  const result = database.prepare(`
    UPDATE decision_drafts
    SET title = ?, description = ?, draft_json = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(draft.title, draft.description, JSON.stringify(draft), updatedAt, id, userId);
  if (result.changes === 0) return null;
  return getDraft(id, userId);
}

export function getDraft(id: string, userId: string): SavedDraft | null {
  const row = database.prepare(`
    SELECT id, draft_json, created_at, updated_at FROM decision_drafts WHERE id = ? AND user_id = ?
  `).get(id, userId);
  if (!row) return null;
  const saved = row as { id: string; draft_json: string; created_at: string; updated_at: string };
  return {
    id: saved.id,
    ...draftSchema.parse(JSON.parse(saved.draft_json)),
    createdAt: saved.created_at,
    updatedAt: saved.updated_at,
  };
}

export function listDrafts(userId: string): SavedDraft[] {
  const rows = database.prepare(`
    SELECT id, draft_json, created_at, updated_at
    FROM decision_drafts WHERE user_id = ? ORDER BY updated_at DESC, rowid DESC
  `).all(userId);
  return rows.map((row) => {
    const saved = row as { id: string; draft_json: string; created_at: string; updated_at: string };
    return {
      id: saved.id,
      ...draftSchema.parse(JSON.parse(saved.draft_json)),
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    };
  });
}

export function deleteDraft(id: string, userId: string): boolean {
  return database.prepare("DELETE FROM decision_drafts WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}
