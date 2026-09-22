import {
  ExecutionLedgerRecordSchema,
  type ExecutionLedgerRecord,
  type ExecutionLedgerStore,
} from "./execution-ledger";
import { OperationFault } from "./contracts";
import { z } from "zod";

const BucketResponseSchema = z
  .object({ data: z.record(z.string(), z.unknown()) })
  .passthrough();

type XYOpsExecutionLedgerStoreConfig = Readonly<{
  readonly baseURL: string;
  readonly apiKey: string;
  readonly bucketID: string;
  readonly fetcher?: typeof fetch;
}>;

const requestURL = (baseURL: string, path: string): string =>
  `${baseURL.replace(/\/$/, "")}/api/app/${path}/v1`;

const readBucketData = (value: unknown): Record<string, unknown> => {
  const parsed = BucketResponseSchema.safeParse(value);
  if (!parsed.success) throw new OperationFault("DEPENDENCY_FAILURE", true, "ledger-read");
  return parsed.data.data;
};

const readLedgerRecord = (
  data: Record<string, unknown>,
  planId: string,
): ExecutionLedgerRecord | undefined => {
  const parsed = ExecutionLedgerRecordSchema.safeParse(data[planId]);
  return parsed.success && parsed.data.planId === planId ? parsed.data : undefined;
};

type CreateXYOpsExecutionLedgerStore = (
  config: XYOpsExecutionLedgerStoreConfig,
) => ExecutionLedgerStore;
export const createXYOpsExecutionLedgerStore: CreateXYOpsExecutionLedgerStore = ({
  baseURL,
  apiKey,
  bucketID,
  fetcher = fetch,
}) => {
  const headers = {
    "content-type": "application/json",
    "x-api-key": apiKey,
  };
  const read: ExecutionLedgerStore["read"] = (planId) =>
    fetcher(
      `${requestURL(baseURL, "get_bucket")}?id=${encodeURIComponent(bucketID)}`,
      { headers },
    )
      .then(async (response) => {
        if (!response.ok) throw new OperationFault("DEPENDENCY_FAILURE", true, "ledger-read");
        return readLedgerRecord(readBucketData(await response.json()), planId);
      })
      .catch((error: unknown) => {
        if (error instanceof OperationFault) throw error;
        throw new OperationFault("DEPENDENCY_FAILURE", true, "ledger-read");
      });
  const write: ExecutionLedgerStore["write"] = (record) =>
    fetcher(requestURL(baseURL, "write_bucket_data"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: bucketID,
        data: { [record.planId]: record },
      }),
    })
      .then((response) => {
        if (!response.ok)
          throw new OperationFault("DEPENDENCY_FAILURE", true, "ledger-write");
      })
      .catch((error: unknown) => {
        if (error instanceof OperationFault) throw error;
        throw new OperationFault("DEPENDENCY_FAILURE", true, "ledger-write");
      });
  return { read, write };
};
