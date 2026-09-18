import type { Envelope, ExecuteResult } from "../../types";
import type {
  MigrationWorkflowEffect,
  MigrationWorkflowEvent,
  MigrationWorkflowState,
} from "../../execute-migration-state-machine";

export type EffectResult =
  | { readonly kind: "event"; readonly event: MigrationWorkflowEvent }
  | { readonly kind: "settled"; readonly result: Envelope<ExecuteResult> }
  | { readonly kind: "noop" };

export type EffectHandler<K extends MigrationWorkflowEffect["kind"]> = (
  state: MigrationWorkflowState,
  effect: Extract<MigrationWorkflowEffect, { readonly kind: K }>,
) => Promise<EffectResult>;
export type EffectHandlerMap = {
  readonly [K in MigrationWorkflowEffect["kind"]]: EffectHandler<K>;
};
