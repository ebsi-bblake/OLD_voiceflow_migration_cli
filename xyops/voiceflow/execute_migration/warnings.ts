import type { Warning } from "../types";

type ExecuteWarnings = (apiKeyRetrieved: boolean) => Warning[];
export const executeWarnings: ExecuteWarnings = (apiKeyRetrieved) => {
  const warnings: Warning[] = [];
  if (!apiKeyRetrieved) {
    warnings.push({
      code: "API_KEY_RETRIEVAL_FAILED",
      message: "Project API key could not be retrieved.",
    });
  }
  return warnings;
};
