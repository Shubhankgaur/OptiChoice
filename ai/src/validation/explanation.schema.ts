export interface DecisionExplanation {
  summary: string;
  winnerRationale: string;
  tradeOffs: string[];
  caveats?: string[] | undefined;
}

export function validateExplanation(data: unknown): DecisionExplanation {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid explanation: Expected an object.");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.summary !== "string" || !obj.summary.trim()) {
    throw new Error("Invalid explanation: Missing or empty 'summary'.");
  }

  if (typeof obj.winnerRationale !== "string" || !obj.winnerRationale.trim()) {
    throw new Error("Invalid explanation: Missing or empty 'winnerRationale'.");
  }

  const tradeOffs = Array.isArray(obj.tradeOffs)
    ? obj.tradeOffs.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const caveats = Array.isArray(obj.caveats)
    ? obj.caveats.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : undefined;

  return {
    summary: obj.summary.trim(),
    winnerRationale: obj.winnerRationale.trim(),
    tradeOffs,
    caveats,
  };
}

