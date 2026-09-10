import { OperationFault } from "../contracts";
import type { HttpBytes, RequestBytesInput } from "../types";
export { isRetryableHttpStatus } from "../guards";
export type { HttpBytes, RequestBytesInput } from "../types";

import { readResponseBody } from "./body";

const isObjectValue = (error: unknown): error is object =>
  typeof error === "object" && error !== null;

type NamedObject = object & Readonly<{ name: unknown }>;
const isNamedObject = (error: unknown): error is NamedObject =>
  isObjectValue(error) && "name" in error;

const getErrorName = (error: unknown): string | undefined => {
  if (!isNamedObject(error)) return undefined;
  return String(error.name);
};

const isDomException = (
  error: unknown,
  domException?: typeof DOMException,
): boolean =>
  typeof domException === "function" && error instanceof domException;

const isAbortNamedError = (error: unknown): boolean =>
  getErrorName(error) === "AbortError";

const isAbortError = (
  error: unknown,
  domException?: typeof DOMException,
): boolean => {
  return isDomException(error, domException)
    ? getErrorName(error) === "AbortError"
    : isAbortNamedError(error);
};

const nonOperationFault = (
  error: unknown,
  domException?: typeof DOMException,
): OperationFault =>
  isAbortError(error, domException)
    ? new OperationFault("DEPENDENCY_TIMEOUT", true)
    : new OperationFault("DEPENDENCY_FAILURE", true);

type RequestFault = (
  error: unknown,
  domException?: typeof DOMException,
) => OperationFault;
const requestFault: RequestFault = (error, domException) => {
  if (error instanceof OperationFault) return error;
  return nonOperationFault(error, domException);
};

type RequireFetch = (candidate: typeof fetch | undefined) => typeof fetch;
const requireFetch: RequireFetch = (candidate) => {
  if (typeof candidate !== "function")
    throw new OperationFault("DEPENDENCY_FAILURE", true);
  return candidate;
};

type RequireAbortController = (
  candidate: typeof AbortController | undefined,
) => typeof AbortController;
const requireAbortController: RequireAbortController = (candidate) => {
  if (typeof candidate !== "function")
    throw new OperationFault("DEPENDENCY_FAILURE", true);
  return candidate;
};

type HttpCapabilities = Readonly<{
  fetch: typeof fetch;
  AbortController: typeof AbortController;
  DOMException: typeof DOMException | undefined;
}>;
type CreateHttpCapabilities = () => HttpCapabilities;
const createHttpCapabilities: CreateHttpCapabilities = () => {
  const fetchImplementation = requireFetch(globalThis.fetch);
  const abortController = requireAbortController(globalThis.AbortController);
  const domException = globalThis.DOMException;
  return {
    fetch: fetchImplementation,
    AbortController: abortController,
    DOMException: typeof domException === "function" ? domException : undefined,
  };
};

type DeclaredExceedsLimit = (declared: number, maxBytes: number) => boolean;
const declaredExceedsLimit: DeclaredExceedsLimit = (declared, maxBytes) =>
  Number.isFinite(declared) && declared > maxBytes;

const validateDeclaredSize = (response: Response, maxBytes: number): void => {
  const declared = Number(response.headers.get("content-length"));
  if (declaredExceedsLimit(declared, maxBytes))
    throw new OperationFault("DEPENDENCY_FAILURE");
};

const readHttpBytes = async (
  response: Response,
  maxBytes: number,
): Promise<HttpBytes> => {
  const bytes =
    response.body === null
      ? new ArrayBuffer(0)
      : await readResponseBody(response.body, maxBytes);
  return { status: response.status, headers: response.headers, bytes };
};

type PerformRequest = (
  request: RequestBytesInput,
  signal: AbortSignal,
  capabilities: HttpCapabilities,
) => Promise<HttpBytes>;
const performRequest: PerformRequest = async (
  request,
  signal,
  capabilities,
) => {
  try {
    const response = await capabilities.fetch(request.url, {
      ...request.init,
      signal,
    });
    validateDeclaredSize(response, request.maxBytes);
    return await readHttpBytes(response, request.maxBytes);
  } catch (error) {
    throw requestFault(error, capabilities.DOMException);
  }
};

type ExecuteTimedRequest = (request: RequestBytesInput) => Promise<HttpBytes>;
const executeTimedRequest: ExecuteTimedRequest = async (request) => {
  const capabilities = createHttpCapabilities();
  const controller = new capabilities.AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeoutMs);
  try {
    return await performRequest(request, controller.signal, capabilities);
  } finally {
    clearTimeout(timer);
  }
};

type RequestBytes = (request: RequestBytesInput) => Promise<HttpBytes>;
export const requestBytes: RequestBytes = async (request) => {
  try {
    return await executeTimedRequest(request);
  } catch (error) {
    throw requestFault(error);
  }
};
