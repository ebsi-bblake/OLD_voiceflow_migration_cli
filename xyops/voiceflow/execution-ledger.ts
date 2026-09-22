import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const ExecutionLedgerStatusSchema = z.enum([
  "in-flight",
  "completed",
  "failed",
  "unknown",
]);

export const ExecutionLedgerRecordSchema = z
  .object({
    planId: nonEmptyString,
    status: ExecutionLedgerStatusSchema,
    timestamp: z.string().datetime({ offset: true }),
  })
  .strict();

export type ExecutionLedgerStatus = z.infer<
  typeof ExecutionLedgerStatusSchema
>;
export type ExecutionLedgerRecord = z.infer<
  typeof ExecutionLedgerRecordSchema
>;
export type ExecutionLedgerDecision = "start" | "skip" | "reconcile";

type ReadExecutionLedgerDecision = (
  record: ExecutionLedgerRecord | undefined,
) => ExecutionLedgerDecision;
export const readExecutionLedgerDecision: ReadExecutionLedgerDecision = (
  record,
) => {
  if (record === undefined || record.status === "failed") return "start";
  if (record.status === "completed") return "skip";
  return "reconcile";
};

type CreateExecutionLedgerRecord = (
  planId: string,
  status: ExecutionLedgerStatus,
  timestamp: string,
) => ExecutionLedgerRecord;
export const createExecutionLedgerRecord: CreateExecutionLedgerRecord = (
  planId,
  status,
  timestamp,
) => ExecutionLedgerRecordSchema.parse({ planId, status, timestamp });

type TransitionExecutionLedgerRecord = (
  record: ExecutionLedgerRecord,
  status: ExecutionLedgerStatus,
  timestamp: string,
) => ExecutionLedgerRecord;
export const transitionExecutionLedgerRecord: TransitionExecutionLedgerRecord = (
  record,
  status,
  timestamp,
) => {
  if (record.status === "completed" || record.status === "unknown")
    return record;
  return createExecutionLedgerRecord(record.planId, status, timestamp);
};
