import { supportedPluginOperations } from "./operations";
import type { PluginOperation } from "./types";

type RecordValue = Readonly<Record<string, unknown>>;

type IsRecord = (value: unknown) => value is RecordValue;
const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

const isArray = (value: unknown): value is readonly unknown[] =>
  Array.isArray(value);

export const isRecord: IsRecord = (value): value is RecordValue => {
  if (!isObject(value)) return false;
  return !isArray(value);
};

type IsNonEmptyString = (value: unknown) => value is string;
export const isNonEmptyString: IsNonEmptyString = (value): value is string =>
  typeof value === "string" && value.trim().length > 0;

type IsPluginOperation = (value: unknown) => value is PluginOperation;
export const isPluginOperation: IsPluginOperation = (
  value,
): value is PluginOperation => {
  if (typeof value !== "string") return false;
  return supportedPluginOperations.some((operation) => operation === value);
};
