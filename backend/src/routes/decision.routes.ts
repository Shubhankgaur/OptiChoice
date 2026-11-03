import { Router } from "express";
import {
  createDraftController,
  deleteDecisionController,
  deleteDraftController,
  evaluateDecisionController,
  explainDecisionController,
  getDraftController,
  listDecisionsController,
  listDraftsController,
  updateDraftController,
} from "../controllers/decision.controller.js";

export const decisionRoutes = Router();

decisionRoutes.get("/decisions", listDecisionsController);
decisionRoutes.delete("/decisions/:id", deleteDecisionController);
decisionRoutes.get("/decisions/drafts", listDraftsController);
decisionRoutes.post("/decisions/drafts", createDraftController);
decisionRoutes.get("/decisions/drafts/:id", getDraftController);
decisionRoutes.put("/decisions/drafts/:id", updateDraftController);
decisionRoutes.delete("/decisions/drafts/:id", deleteDraftController);
decisionRoutes.post("/decisions/evaluate", evaluateDecisionController);
decisionRoutes.get("/decisions/:id/explain", explainDecisionController);
decisionRoutes.post("/decisions/explain", explainDecisionController);

