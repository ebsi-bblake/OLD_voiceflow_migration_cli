export type ReconciliationObservation =
  | { readonly kind: "confirmed-non-start" }
  | { readonly kind: "job-active" }
  | { readonly kind: "job-completed" }
  | { readonly kind: "job-failed"; readonly mutation: "none" | "unknown" }
  | { readonly kind: "ambiguous" };

export type ReconciliationDecision =
  | "start"
  | "resume-observation"
  | "settle-completed"
  | "settle-failed"
  | "settle-unknown"
  | "block";

type ReconcileExecution = (
  observation: ReconciliationObservation,
) => ReconciliationDecision;
export const reconcileExecution: ReconcileExecution = (observation) => {
  switch (observation.kind) {
    case "confirmed-non-start":
      return "start";
    case "job-active":
      return "resume-observation";
    case "job-completed":
      return "settle-completed";
    case "job-failed":
      return observation.mutation === "none"
        ? "settle-failed"
        : "settle-unknown";
    case "ambiguous":
      return "block";
  }
};
