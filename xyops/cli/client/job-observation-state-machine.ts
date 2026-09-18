import type { CliDiagnosticCode } from "../types";

export type JobObservationState =
  | { readonly kind: "DISPATCHED"; readonly jobID: string }
  | { readonly kind: "STREAMING"; readonly jobID: string }
  | {
      readonly kind: "POLLING";
      readonly jobID: string;
      readonly attempt: number;
    }
  | { readonly kind: "SUCCEEDED"; readonly jobID: string }
  | {
      readonly kind: "FAILED";
      readonly jobID: string;
      readonly diagnosticCode: CliDiagnosticCode;
    }
  | {
      readonly kind: "UNKNOWN_OUTCOME";
      readonly jobID: string;
      readonly diagnosticCode: CliDiagnosticCode;
    };

export type JobObservationEffect =
  | { readonly kind: "start-stream"; readonly jobID: string }
  | {
      readonly kind: "start-polling";
      readonly jobID: string;
      readonly attempt: number;
    }
  | { readonly kind: "settle" };

export type JobObservationEvent =
  | { readonly kind: "execute-dispatched"; readonly jobID: string }
  | { readonly kind: "stream-failed" }
  | { readonly kind: "polling-started" }
  | { readonly kind: "stream-succeeded" }
  | { readonly kind: "job-active"; readonly attempt: number }
  | { readonly kind: "job-succeeded" }
  | { readonly kind: "job-failed" }
  | {
      readonly kind: "observation-failed";
      readonly diagnosticCode: CliDiagnosticCode;
    }
  | { readonly kind: "poll-timeout" };

export type JobObservationTransition = Readonly<{
  readonly state: JobObservationState;
  readonly accepted: boolean;
  readonly effects: readonly JobObservationEffect[];
}>;

type CreateJobObservationState = (jobID: string) => JobObservationState;
export const createJobObservationState: CreateJobObservationState = (
  jobID,
) => ({ kind: "DISPATCHED", jobID });

type TransitionJobObservation = (
  state: JobObservationState,
  event: JobObservationEvent,
) => JobObservationTransition;
const ignored = (state: JobObservationState): JobObservationTransition => ({
  state,
  accepted: false,
  effects: [],
});
type JobObservationEventHandler = (
  state: JobObservationState,
  event: JobObservationEvent,
) => JobObservationTransition | undefined;

const isTerminal = (state: JobObservationState): boolean =>
  state.kind === "SUCCEEDED" ||
  state.kind === "FAILED" ||
  state.kind === "UNKNOWN_OUTCOME";

const pollingState = (
  jobID: string,
  attempt: number,
): JobObservationTransition => ({
  state: { kind: "POLLING", jobID, attempt },
  accepted: true,
  effects: [{ kind: "start-polling", jobID, attempt }],
});

const handleExecuteDispatched: JobObservationEventHandler = (state, event) =>
  event.kind === "execute-dispatched" &&
  state.kind === "DISPATCHED" &&
  event.jobID === state.jobID
    ? {
        state: { kind: "STREAMING", jobID: state.jobID },
        accepted: true,
        effects: [{ kind: "start-stream", jobID: state.jobID }],
      }
    : event.kind === "execute-dispatched"
      ? ignored(state)
      : undefined;

const handlePollingStarted: JobObservationEventHandler = (state, event) =>
  event.kind === "polling-started" &&
  (state.kind === "DISPATCHED" || state.kind === "STREAMING")
    ? pollingState(state.jobID, 0)
    : event.kind === "polling-started"
      ? ignored(state)
      : undefined;

const handleStreamFailed: JobObservationEventHandler = (state, event) =>
  event.kind === "stream-failed" && state.kind === "STREAMING"
    ? pollingState(state.jobID, 0)
    : event.kind === "stream-failed"
      ? ignored(state)
      : undefined;

const handleStreamSucceeded: JobObservationEventHandler = (state, event) =>
  event.kind === "stream-succeeded" && state.kind === "STREAMING"
    ? {
        state: { kind: "SUCCEEDED", jobID: state.jobID },
        accepted: true,
        effects: [{ kind: "settle" }],
      }
    : event.kind === "stream-succeeded"
      ? ignored(state)
      : undefined;

const handleJobActive: JobObservationEventHandler = (state, event) =>
  event.kind === "job-active" && state.kind === "POLLING"
    ? {
        state: { kind: "POLLING", jobID: state.jobID, attempt: event.attempt },
        accepted: true,
        effects: [],
      }
    : event.kind === "job-active"
      ? ignored(state)
      : undefined;

const handleJobSucceeded: JobObservationEventHandler = (state, event) =>
  event.kind === "job-succeeded" && state.kind === "POLLING"
    ? {
        state: { kind: "SUCCEEDED", jobID: state.jobID },
        accepted: true,
        effects: [{ kind: "settle" }],
      }
    : event.kind === "job-succeeded"
      ? ignored(state)
      : undefined;

const handleJobFailed: JobObservationEventHandler = (state, event) =>
  event.kind === "job-failed" && state.kind === "POLLING"
    ? {
        state: { kind: "FAILED", jobID: state.jobID, diagnosticCode: "job" },
        accepted: true,
        effects: [{ kind: "settle" }],
      }
    : event.kind === "job-failed"
      ? ignored(state)
      : undefined;

const handleObservationFailed: JobObservationEventHandler = (state, event) =>
  event.kind === "observation-failed" && state.kind === "POLLING"
    ? {
        state: {
          kind: "UNKNOWN_OUTCOME",
          jobID: state.jobID,
          diagnosticCode: event.diagnosticCode,
        },
        accepted: true,
        effects: [{ kind: "settle" }],
      }
    : event.kind === "observation-failed"
      ? ignored(state)
      : undefined;

const handlePollTimeout: JobObservationEventHandler = (state, event) =>
  event.kind === "poll-timeout" && state.kind === "POLLING"
    ? {
        state: {
          kind: "UNKNOWN_OUTCOME",
          jobID: state.jobID,
          diagnosticCode: "execute-outcome-unknown",
        },
        accepted: true,
        effects: [{ kind: "settle" }],
      }
    : event.kind === "poll-timeout"
      ? ignored(state)
      : undefined;

const jobObservationHandlers: readonly JobObservationEventHandler[] = [
  handleExecuteDispatched,
  handlePollingStarted,
  handleStreamFailed,
  handleStreamSucceeded,
  handleJobActive,
  handleJobSucceeded,
  handleJobFailed,
  handleObservationFailed,
  handlePollTimeout,
];

export const transitionJobObservation: TransitionJobObservation = (
  state,
  event,
) => {
  if (isTerminal(state)) return ignored(state);
  for (const handler of jobObservationHandlers) {
    const result = handler(state, event);
    if (result !== undefined) return result;
  }
  return ignored(state);
};
