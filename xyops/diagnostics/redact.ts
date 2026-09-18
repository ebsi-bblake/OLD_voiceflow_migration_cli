import type { SafeContextValue } from "./types";

const MAX_DEPTH = 6;
const MAX_KEYS = 32;
const MAX_ITEMS = 32;
const MAX_STRING = 256;
const REDACTED = "[REDACTED]";
const sensitiveKeys = new Set([
  "authorization",
  "auth",
  "apikey",
  "api_key",
  "cookie",
  "credential",
  "credentials",
  "defaultvalue",
  "exported",
  "exporteddata",
  "filecontents",
  "input",
  "message",
  "multipart",
  "payload",
  "rawbody",
  "requestbody",
  "requestpayload",
  "responsebody",
  "responsepayload",
  "secret",
  "secrets",
  "password",
  "stack",
  "token",
  "value",
]);

type RedactDiagnosticValue = (
  value: unknown,
  depth?: number,
) => SafeContextValue;

const normalizedKey = (key: string): string =>
  key.toLowerCase().replace(/[\s_-]/g, "");

const isSensitiveKey = (key: string): boolean =>
  sensitiveKeys.has(normalizedKey(key));

const boundedString = (value: string): string => value.slice(0, MAX_STRING);
const isRecord = (value: object): value is Record<string, unknown> =>
  !Array.isArray(value);

const redactRecord = (
  value: Record<string, unknown>,
  depth: number,
): Readonly<Record<string, SafeContextValue>> =>
  Object.fromEntries(
    Object.entries(value)
      .slice(0, MAX_KEYS)
      .map(([key, entry]) => [
        key,
        isSensitiveKey(key)
          ? REDACTED
          : redactDiagnosticValue(entry, depth + 1),
      ]),
  );

const redactArray = (
  value: readonly unknown[],
  depth: number,
): readonly SafeContextValue[] =>
  value
    .slice(0, MAX_ITEMS)
    .map((entry) => redactDiagnosticValue(entry, depth + 1));

const redactMap = (
  value: ReadonlyMap<unknown, unknown>,
  depth: number,
): Readonly<Record<string, SafeContextValue>> =>
  redactRecord(
    Object.fromEntries(
      [...value.entries()]
        .slice(0, MAX_KEYS)
        .map(([key, entry]) => [String(key), entry]),
    ),
    depth,
  );

const redactPrimitive = (value: unknown): SafeContextValue | undefined => {
  if (typeof value === "string") return boundedString(value);
  if (typeof value === "number" || typeof value === "boolean" || value === null)
    return value;
  return undefined;
};

const redactContainer = (value: object, depth: number): SafeContextValue => {
  if (Array.isArray(value)) return redactArray(value, depth);
  if (value instanceof Map) return redactMap(value, depth);
  if (value instanceof Error) return "[UNTRUSTED]";
  if (isRecord(value)) return redactRecord(value, depth);
  return "[UNTRUSTED]";
};

export const redactDiagnosticValue: RedactDiagnosticValue = (
  value,
  depth = 0,
) => {
  if (depth >= MAX_DEPTH) return "[TRUNCATED]";
  const primitive = redactPrimitive(value);
  if (primitive !== undefined) return primitive;
  if (typeof value === "object" && value !== null)
    return redactContainer(value, depth);
  return "[UNTRUSTED]";
};
