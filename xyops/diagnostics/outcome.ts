import type { OutcomeState } from "./create";

export type DispatchOutcomeInput = Readonly<{
  dispatched: boolean;
  confirmedFailure: boolean;
}>;

type ClassifyDispatchOutcome = (input: DispatchOutcomeInput) => OutcomeState;
export const classifyDispatchOutcome: ClassifyDispatchOutcome = ({
  dispatched,
  confirmedFailure,
}) => {
  if (!dispatched) return "before-dispatch-failure";
  if (confirmedFailure) return "confirmed-rejection";
  return "unknown-outcome";
};
