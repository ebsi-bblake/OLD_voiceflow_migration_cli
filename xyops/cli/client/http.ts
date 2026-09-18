import { fail, CliError, parseDiagnostic } from "../diagnostics";
import { isRetryableStatus, isSuccessfulCode } from "../guards";
import { XYOpsResponseSchema } from "../schemas/xyops-responses";
import type { XYOpsResponse } from "../types";
import { XYOpsRecordSchema } from "../schemas/xyops-responses";

export type Sleep = (milliseconds: number) => Promise<void>;
export type RequestBody = Readonly<Record<string, unknown>>;
export type Request = (
  path: string,
  body: RequestBody,
  endpoint: string,
) => Promise<XYOpsResponse>;
export type StreamResponseReader<T> = (response: Response) => Promise<T>;

type IsAbortError = (error: unknown) => boolean;
const isAbortError: IsAbortError = (error) =>
  error instanceof DOMException && error.name === "AbortError";

type ToFetchError = (error: unknown, endpoint: string) => CliError;
const toFetchError: ToFetchError = (error, endpoint) =>
  fail(isAbortError(error) ? "timeout" : "network", {
    endpoint,
    retryable: true,
  });

type FetchRequest = (
  fetcher: typeof fetch,
  url: string,
  apiKey: string,
  body: RequestBody,
  timeoutMs: number,
  endpoint: string,
) => Promise<Response>;
const fetchRequest: FetchRequest = async (
  fetcher,
  url,
  apiKey,
  body,
  timeoutMs,
  endpoint,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(url, {
      method: "POST",
      headers: { "content-type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    throw toFetchError(error, endpoint);
  } finally {
    clearTimeout(timeout);
  }
};

type ReadHTTPDiagnostic = (
  response: Response,
) => Promise<ReturnType<typeof parseDiagnostic>>;
export const readHTTPDiagnostic: ReadHTTPDiagnostic = async (response) => {
  try {
    const body: unknown = await response.clone().json();
    const record = XYOpsRecordSchema.safeParse(body);
    if (!record.success) return undefined;
    const error = XYOpsRecordSchema.safeParse(record.data.error);
    const candidate =
      record.data.diagnostic ??
      (error.success ? error.data.diagnostic : undefined);
    return parseDiagnostic(candidate);
  } catch {
    return undefined;
  }
};

type RequireHTTPResponse = (
  response: Response,
  endpoint: string,
) => Promise<Response>;
const requireHTTPResponse: RequireHTTPResponse = async (response, endpoint) => {
  if (response.ok) return response;
  const diagnostic = await readHTTPDiagnostic(response);
  throw fail("http", {
    endpoint,
    status: response.status,
    retryable: isRetryableStatus(response.status),
    ...(diagnostic === undefined ? {} : { diagnostic }),
  });
};

type ParseJSONResponse = (
  response: Response,
  endpoint: string,
) => Promise<unknown>;
const parseJSONResponse: ParseJSONResponse = async (response, endpoint) => {
  try {
    return await response.json();
  } catch {
    throw fail("api", {
      endpoint,
      nextAction: "XYOps returned an invalid JSON response.",
    });
  }
};

type RequireXYOpsResponse = (value: unknown, endpoint: string) => XYOpsResponse;
const requireXYOpsResponse: RequireXYOpsResponse = (value, endpoint) => {
  const parsed = XYOpsResponseSchema.safeParse(value);
  if (!parsed.success)
    throw fail("api", {
      endpoint,
      nextAction: "XYOps returned an invalid response.",
    });
  return parsed.data;
};

type RequireSuccessfulResponse = (
  value: XYOpsResponse,
  endpoint: string,
) => XYOpsResponse;
const requireSuccessfulResponse: RequireSuccessfulResponse = (
  value,
  endpoint,
) => {
  if (!isSuccessfulCode(value.code))
    throw fail("api", {
      endpoint,
      nextAction: "XYOps rejected the migration event.",
    });
  return value;
};

type ValidateAPIResponse = (value: unknown, endpoint: string) => XYOpsResponse;
const validateAPIResponse: ValidateAPIResponse = (value, endpoint) =>
  requireSuccessfulResponse(requireXYOpsResponse(value, endpoint), endpoint);

type FetchJSON = (
  fetcher: typeof fetch,
  url: string,
  apiKey: string,
  body: RequestBody,
  timeoutMs: number,
  endpoint: string,
) => Promise<XYOpsResponse>;
export const fetchJSON: FetchJSON = async (
  fetcher,
  url,
  apiKey,
  body,
  timeoutMs,
  endpoint,
) => {
  const response = await requireHTTPResponse(
    await fetchRequest(fetcher, url, apiKey, body, timeoutMs, endpoint),
    endpoint,
  );
  const parsed = await parseJSONResponse(response, endpoint);
  return validateAPIResponse(parsed, endpoint);
};

type FetchSSE = <T>(
  fetcher: typeof fetch,
  url: string,
  apiKey: string,
  timeoutMs: number,
  endpoint: string,
  readResponse: StreamResponseReader<T>,
) => Promise<T>;
export const fetchSSE: FetchSSE = async (
  fetcher,
  url,
  apiKey,
  timeoutMs,
  endpoint,
  readResponse,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      method: "GET",
      headers: { Accept: "text/event-stream", "X-API-Key": apiKey },
      signal: controller.signal,
    });
    if (!response.ok) {
      const diagnostic = await readHTTPDiagnostic(response);
      throw fail("http", {
        endpoint,
        status: response.status,
        retryable: isRetryableStatus(response.status),
        ...(diagnostic === undefined ? {} : { diagnostic }),
      });
    }
    return await readResponse(response);
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw toFetchError(error, endpoint);
  } finally {
    clearTimeout(timeout);
  }
};

export const defaultSleep: Sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
