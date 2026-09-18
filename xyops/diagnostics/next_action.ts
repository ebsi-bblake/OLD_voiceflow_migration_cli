type DiagnosticClass =
  | "authentication failure"
  | "invalid configuration"
  | "confirmed dependency failure"
  | "timeout before dispatch"
  | "unknown execute outcome"
  | "unknown import outcome"
  | "plan mismatch";

const actions: Readonly<Record<DiagnosticClass, string>> = {
  "authentication failure": "Check authentication and sign in again",
  "invalid configuration": "Check configuration and migration inputs",
  "confirmed dependency failure":
    "Retry only when the diagnostic policy permits it",
  "timeout before dispatch": "Retry the operation when safe",
  "unknown execute outcome": "Reconcile the execute job before retrying",
  "unknown import outcome": "Reconcile the destination project before retrying",
  "plan mismatch": "Re-run planning and confirm the plan ID",
};

type NextAction = (diagnosticClass: DiagnosticClass) => string;
export const nextAction: NextAction = (diagnosticClass) =>
  actions[diagnosticClass];
