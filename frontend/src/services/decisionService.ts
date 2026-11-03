import { request } from "./api";
import { evaluateDecision } from "../../../decision-engine/src/index";
import type { Alternative, Criterion, Decision, RankingResult, ScoreBreakdown } from "@/types/decision";
import type { DecisionDraft } from "@/hooks/useDecision";

export interface SavedDraft extends Omit<DecisionDraft, "id"> {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedDecision extends Decision {
  status: "completed";
  breakdown: ScoreBreakdown[];
}

export interface EvaluateRequest {
  draftId?: string;
  scoringMode: "rating" | "relative";
  title: string;
  description: string;
  alternatives: Alternative[];
  criteria: Criterion[];
  ratings: { alternativeId: string; criterionId: string; value: number }[];
}

export interface EvaluateResponse {
  decisionId: string;
  createdAt: string;
  ranking: RankingResult[];
  breakdown: ScoreBreakdown[];
}

export interface ProductSearchResult {
  id: string;
  productId: string | null;
  title: string;
  source: string;
  sourceUrl: string;
  price: number | null;
  priceLabel: string | null;
  imageUrl: string | null;
}

export interface ProductSpecifications {
  batteryHours: number | null;
  batteryLabel: string | null;
  batterySourceUrl: string | null;
  weightKg: number | null;
  weightLabel: string | null;
  weightSourceUrl: string | null;
  performanceScore: number | null;
  performanceLabel: string | null;
  performanceSourceUrl: string | null;
  fetchedAt: string;
}

export interface DecisionExplanation {
  summary: string;
  winnerRationale: string;
  tradeOffs: string[];
  caveats?: string[];
}

const LAST_RESULT_KEY = "optichoice.lastResult";

export const decisionService = {
  async searchProducts(query: string): Promise<{ products: ProductSearchResult[]; fetchedAt: string }> {
    return request(`/products/search?q=${encodeURIComponent(query)}`);
  },
  async getProductSpecifications(productId: string, title: string): Promise<ProductSpecifications> {
    return request(`/products/${encodeURIComponent(productId)}/specifications?title=${encodeURIComponent(title)}`);
  },
  async list(): Promise<Decision[]> {
    const response = await request<{ decisions: SavedDecision[] }>("/decisions");
    return response.decisions;
  },
  async history(): Promise<SavedDecision[]> {
    const response = await request<{ decisions: SavedDecision[] }>("/decisions");
    return response.decisions;
  },
  async listDrafts(): Promise<SavedDraft[]> {
    const response = await request<{ drafts: SavedDraft[] }>("/decisions/drafts");
    return response.drafts;
  },
  async getDraft(id: string): Promise<SavedDraft> {
    const response = await request<{ draft: SavedDraft }>(`/decisions/drafts/${id}`);
    return response.draft;
  },
  async createDraft(draft: DecisionDraft): Promise<SavedDraft> {
    const response = await request<{ draft: SavedDraft }>("/decisions/drafts", {
      method: "POST",
      body: JSON.stringify(toDraftPayload(draft)),
    });
    return response.draft;
  },
  async updateDraft(id: string, draft: DecisionDraft): Promise<SavedDraft> {
    const response = await request<{ draft: SavedDraft }>(`/decisions/drafts/${id}`, {
      method: "PUT",
      body: JSON.stringify(toDraftPayload(draft)),
    });
    return response.draft;
  },
  async deleteDraft(id: string): Promise<void> {
    await request<{ deleted: boolean }>(`/decisions/drafts/${id}`, { method: "DELETE" });
  },
  async deleteDecision(id: string): Promise<void> {
    await request<{ deleted: boolean }>(`/decisions/${id}`, { method: "DELETE" });
  },
  /** The backend validates the request and calls the deterministic engine. */
  async evaluate(req: EvaluateRequest): Promise<EvaluateResponse> {
    const res = await request<EvaluateResponse>("/decisions/evaluate", {
      method: "POST",
      body: JSON.stringify(req),
    });
    sessionStorage.setItem(LAST_RESULT_KEY, JSON.stringify({ request: req, response: res }));
    return res;
  },
  evaluateWithCriteria(req: EvaluateRequest, criteria: Criterion[]) {
    return evaluateDecision({
      alternatives: req.alternatives,
      criteria,
      ratings: req.ratings,
      scoringMode: req.scoringMode,
    });
  },
  async getExplanation(decisionId: string): Promise<DecisionExplanation> {
    const res = await request<{ explanation: DecisionExplanation }>(`/decisions/${decisionId}/explain`);
    return res.explanation;
  },
  async generateExplanation(payload: object): Promise<DecisionExplanation> {
    const res = await request<{ explanation: DecisionExplanation }>("/decisions/explain", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.explanation;
  },
};

function toDraftPayload({ id: _id, ...draft }: DecisionDraft) {
  return draft;
}
