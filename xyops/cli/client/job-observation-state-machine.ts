/* oxlint-disable complexity -- exhaustive observation lifecycle transitions. */
import type { CliDiagnosticCode } from "../types";

export type JobObservationState =
  | { readonly kind: "DISPATCHED"; readonly jobID: string }
  | { readonly kind: "STREAMING"; readonly jobID: string }
  | { readonly kind: "STREAM_RECONCILING"; readonly jobID: string; readonly attempt: number }
  | { readonly kind: "POLLING"; readonly jobID: string; readonly attempt: number }
  | { readonly kind: "SUCCEEDED"; readonly jobID: string }
  | { readonly kind: "FAILED"; readonly jobID: string; readonly diagnosticCode: CliDiagnosticCode }
  | { readonly kind: "UNKNOWN_OUTCOME"; readonly jobID: string; readonly diagnosticCode: CliDiagnosticCode };

export type JobObservationEvent =
  | { readonly kind: "execute-dispatched"; readonly jobID: string }
  | { readonly kind: "stream-failed" }
  | { readonly kind: "stream-succeeded" }
  | { readonly kind: "job-active"; readonly attempt: number }
  | { readonly kind: "job-succeeded" }
  | { readonly kind: "job-failed" }
  | { readonly kind: "observation-failed"; readonly diagnosticCode: CliDiagnosticCode }
  | { readonly kind: "poll-timeout" };

export type JobObservationTransition = Readonly<{
  readonly state: JobObservationState;
  readonly accepted: boolean;
}>;

type CreateJobObservationState = (jobID: string) => JobObservationState;
export const createJobObservationState: CreateJobObservationState = (jobID) => ({
  kind: "DISPATCHED",
  jobID,
});

type TransitionJobObservation = (
  state: JobObservationState,
  event: JobObservationEvent,
) => JobObservationTransition;
export const transitionJobObservation: TransitionJobObservation = (state, event) => {
  if (["SUCCEEDED", "FAILED", "UNKNOWN_OUTCOME"].includes(state.kind))
    return { state, accepted: false };
  if (event.kind === "execute-dispatched" && state.kind === "DISPATCHED")
    return { state: { kind: "STREAMING", jobID: event.jobID }, accepted: true };
  if (event.kind === "stream-failed" && state.kind === "STREAMING")
    return { state: { kind: "STREAM_RECONCILING", jobID: state.jobID, attempt: 0 }, accepted: true };
  if (event.kind === "stream-succeeded" && state.kind === "STREAMING")
    return { state: { kind: "SUCCEEDED", jobID: state.jobID }, accepted: true };
  if (event.kind === "job-active" && state.kind === "STREAM_RECONCILING")
    return { state: { kind: "POLLING", jobID: state.jobID, attempt: event.attempt }, accepted: true };
  if (event.kind === "job-succeeded" && ["STREAM_RECONCILING", "POLLING"].includes(state.kind))
    return { state: { kind: "SUCCEEDED", jobID: state.jobID }, accepted: true };
  if (event.kind === "job-failed" && ["STREAM_RECONCILING", "POLLING"].includes(state.kind))
    return { state: { kind: "FAILED", jobID: state.jobID, diagnosticCode: "job" }, accepted: true };
  if (event.kind === "observation-failed" && ["STREAM_RECONCILING", "POLLING"].includes(state.kind))
    return { state: { kind: "UNKNOWN_OUTCOME", jobID: state.jobID, diagnosticCode: event.diagnosticCode }, accepted: true };
  if (event.kind === "poll-timeout" && ["STREAM_RECONCILING", "POLLING"].includes(state.kind))
    return { state: { kind: "UNKNOWN_OUTCOME", jobID: state.jobID, diagnosticCode: "execute-outcome-unknown" }, accepted: true };
  return { state, accepted: false };
};
