import { fail, CliError } from "../diagnostics";
import {
  isRetryableStatus,
  isSuccessfulCode,
  isXYOpsResponse,
} from "../guards";
import type { XYOpsResponse } from "../types";

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
  return fetcher(url, {
    method: "POST",
    headers: { "content-type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .catch((error) => Promise.reject(toFetchError(error, endpoint)))
    .finally(() => clearTimeout(timeout));
};

type RequireHTTPResponse = (response: Response, endpoint: string) => Response;
const requireHTTPResponse: RequireHTTPResponse = (response, endpoint) => {
  if (!response.ok)
    throw fail("http", {
      endpoint,
      status: response.status,
      retryable: isRetryableStatus(response.status),
    });
  return response;
};

type ParseJSONResponse = (
  response: Response,
  endpoint: string,
) => Promise<unknown>;
const parseJSONResponse: ParseJSONResponse = (response, endpoint) =>
  response.json().catch(() =>
    Promise.reject(
      fail("api", {
        endpoint,
        nextAction: "XYOps returned an invalid JSON response.",
      }),
    ),
  );

type RequireXYOpsResponse = (value: unknown, endpoint: string) => XYOpsResponse;
const requireXYOpsResponse: RequireXYOpsResponse = (value, endpoint) => {
  if (!isXYOpsResponse(value))
    throw fail("api", {
      endpoint,
      nextAction: "XYOps returned an invalid response.",
    });
  return value;
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
  const response = requireHTTPResponse(
    await fetchRequest(fetcher, url, apiKey, body, timeoutMs, endpoint),
    endpoint,
  );
  return validateAPIResponse(
    await parseJSONResponse(response, endpoint),
    endpoint,
  );
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
  return fetcher(url, {
    method: "GET",
    headers: { Accept: "text/event-stream", "X-API-Key": apiKey },
    signal: controller.signal,
  })
    .catch((error) => Promise.reject(toFetchError(error, endpoint)))
    .then((response) => {
      if (!response.ok)
        throw fail("http", {
          endpoint,
          status: response.status,
          retryable: isRetryableStatus(response.status),
        });
      return readResponse(response);
    })
    .catch((error) =>
      error instanceof CliError
        ? Promise.reject(error)
        : Promise.reject(toFetchError(error, endpoint)),
    )
    .finally(() => clearTimeout(timeout));
};

export const defaultSleep: Sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
