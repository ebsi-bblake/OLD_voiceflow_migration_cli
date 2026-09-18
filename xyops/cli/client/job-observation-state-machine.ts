/* oxlint-disable complexity -- exhaustive observation lifecycle transitions. */
import type { CliDiagnosticCode } from "../types";

export type JobObservationState =
  | { readonly kind: "DISPATCHED"; readonly jobID: string }
  | { readonly kind: "STREAMING"; readonly jobID: string }
  | { readonly kind: "POLLING"; readonly jobID: string; readonly attempt: number }
  | { readonly kind: "SUCCEEDED"; readonly jobID: string }
  | { readonly kind: "FAILED"; readonly jobID: string; readonly diagnosticCode: CliDiagnosticCode }
  | { readonly kind: "UNKNOWN_OUTCOME"; readonly jobID: string; readonly diagnosticCode: CliDiagnosticCode };

export type JobObservationEffect =
  | { readonly kind: "start-stream"; readonly jobID: string }
  | { readonly kind: "start-polling"; readonly jobID: string; readonly attempt: number }
  | { readonly kind: "settle" };

export type JobObservationEvent =
  | { readonly kind: "execute-dispatched"; readonly jobID: string }
  | { readonly kind: "stream-failed" }
  | { readonly kind: "polling-started" }
  | { readonly kind: "stream-succeeded" }
  | { readonly kind: "job-active"; readonly attempt: number }
  | { readonly kind: "job-succeeded" }
  | { readonly kind: "job-failed" }
  | { readonly kind: "observation-failed"; readonly diagnosticCode: CliDiagnosticCode }
  | { readonly kind: "poll-timeout" };

export type JobObservationTransition = Readonly<{
  readonly state: JobObservationState;
  readonly accepted: boolean;
  readonly effects: readonly JobObservationEffect[];
}>;

type CreateJobObservationState = (jobID: string) => JobObservationState;
export const createJobObservationState: CreateJobObservationState = (jobID) => ({ kind: "DISPATCHED", jobID });

type TransitionJobObservation = (state: JobObservationState, event: JobObservationEvent) => JobObservationTransition;
const ignored = (state: JobObservationState): JobObservationTransition => ({ state, accepted: false, effects: [] });
export const transitionJobObservation: TransitionJobObservation = (state, event) => {
  if (["SUCCEEDED", "FAILED", "UNKNOWN_OUTCOME"].includes(state.kind)) return ignored(state);
  if (
    event.kind === "execute-dispatched" &&
    state.kind === "DISPATCHED" &&
    event.jobID === state.jobID
  )
    return { state: { kind: "STREAMING", jobID: state.jobID }, accepted: true, effects: [{ kind: "start-stream", jobID: state.jobID }] };
  if (
    event.kind === "polling-started" &&
    (state.kind === "DISPATCHED" || state.kind === "STREAMING")
  )
    return { state: { kind: "POLLING", jobID: state.jobID, attempt: 0 }, accepted: true, effects: [{ kind: "start-polling", jobID: state.jobID, attempt: 0 }] };
  if (
    event.kind === "stream-failed" &&
    state.kind === "STREAMING"
  )
    return { state: { kind: "POLLING", jobID: state.jobID, attempt: 0 }, accepted: true, effects: [{ kind: "start-polling", jobID: state.jobID, attempt: 0 }] };
  if (event.kind === "stream-succeeded" && state.kind === "STREAMING")
    return { state: { kind: "SUCCEEDED", jobID: state.jobID }, accepted: true, effects: [{ kind: "settle" }] };
  if (event.kind === "job-active" && state.kind === "POLLING")
    return { state: { kind: "POLLING", jobID: state.jobID, attempt: event.attempt }, accepted: true, effects: [] };
  if (event.kind === "job-succeeded" && state.kind === "POLLING")
    return { state: { kind: "SUCCEEDED", jobID: state.jobID }, accepted: true, effects: [{ kind: "settle" }] };
  if (event.kind === "job-failed" && state.kind === "POLLING")
    return { state: { kind: "FAILED", jobID: state.jobID, diagnosticCode: "job" }, accepted: true, effects: [{ kind: "settle" }] };
  if (event.kind === "observation-failed" && state.kind === "POLLING")
    return { state: { kind: "UNKNOWN_OUTCOME", jobID: state.jobID, diagnosticCode: event.diagnosticCode }, accepted: true, effects: [{ kind: "settle" }] };
  if (event.kind === "poll-timeout" && state.kind === "POLLING")
    return { state: { kind: "UNKNOWN_OUTCOME", jobID: state.jobID, diagnosticCode: "execute-outcome-unknown" }, accepted: true, effects: [{ kind: "settle" }] };
  return ignored(state);
};
