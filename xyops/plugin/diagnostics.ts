import { PLUGIN_VERSION } from "./version";
import { z } from "zod";
import { VoiceflowRegex } from "../voiceflow/regex";
import { PluginStage } from "./types";
import {
  createDiagnostic,
  createUnexpectedDiagnostic,
} from "../diagnostics/create";
import type { Diagnostic } from "../diagnostics/types";
export type { PluginStage } from "./types";

export const pluginStages = Object.values(PluginStage);

type CreatePluginDiagnostic = (stage: PluginStage, error: unknown) => Diagnostic;
export const createPluginDiagnostic: CreatePluginDiagnostic = (stage, error) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return createDiagnostic(
      { code: error.code, retryable: false },
      "plugin",
      stage,
    );
  }
  return createUnexpectedDiagnostic(error, "plugin", stage);
};

const maxDiagnosticLength = 320;
const maxErrorClassLength = 80;

const readErrorName = (error: unknown): string =>
  error instanceof Error ? error.name : "UnknownError";

const normalizeErrorName = (name: string): string =>
  name.trim() === "" ? "UnknownError" : name;

type ReadErrorClass = (error: unknown) => string;
const readErrorClass: ReadErrorClass = (error) =>
  normalizeErrorName(readErrorName(error));

const isZodError = (error: unknown): error is z.ZodError =>
  error instanceof z.ZodError ||
  (error instanceof Error && error.name === "ZodError");
const readZodIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.map(String).join(".").slice(0, 60) || "root";
  const code = issue.code.slice(0, 40);
  if (issue.code === "invalid_type")
    return `issuePath=${path};code=${code};expected=${issue.expected}`;
  return `issuePath=${path};code=${code}`;
};
const readZodErrorText = (error: z.ZodError): string =>
  error.issues.slice(0, 3).map(readZodIssue).join(", ").slice(0, 240);

const readErrorText = (error: unknown): string =>
  isZodError(error)
    ? readZodErrorText(error)
    : error instanceof Error
      ? error.message
      : "Unknown error";

const normalizeErrorText = (message: string): string =>
  message.trim() === "" ? "Unknown error" : message;

type ReadErrorMessage = (error: unknown) => string;
const readErrorMessage: ReadErrorMessage = (error) =>
  normalizeErrorText(readErrorText(error));

type RemoveStackLines = (message: string) => string;
const removeStackLines: RemoveStackLines = (message) =>
  message
    .split(VoiceflowRegex.pluginLineBreak)
    .filter((line) => !VoiceflowRegex.stackFrame.test(line))
    .join(" ");

type RedactSensitiveValues = (message: string) => string;
const redactSensitiveValues: RedactSensitiveValues = (message) =>
  message
    .replace(VoiceflowRegex.bearerValue, "Bearer [REDACTED]")
    .replace(VoiceflowRegex.pluginJWT, "[REDACTED_JWT]")
    .replace(VoiceflowRegex.sensitiveAssignment, "$1[REDACTED]")
    .replace(VoiceflowRegex.dataAssignment, "$1[REDACTED_DATA]")
    .replace(VoiceflowRegex.structuredData, "[REDACTED_DATA]")
    .replace(VoiceflowRegex.prefixedSecret, "[REDACTED]")
    .replace(VoiceflowRegex.pluginLongToken, "[REDACTED]");

const isControlCharacter = (character: string): boolean => {
  const code = character.charCodeAt(0);
  if (code <= 31) return true;
  return code === 127;
};

type SanitizeDiagnosticText = (value: string, limit: number) => string;
const sanitizeDiagnosticText: SanitizeDiagnosticText = (value, limit) =>
  redactSensitiveValues(removeStackLines(value))
    .split("")
    .map((character) => (isControlCharacter(character) ? " " : character))
    .join("")
    .replace(VoiceflowRegex.whitespace, " ")
    .trim()
    .slice(0, limit);

const fallbackDiagnosticValue = (value: string, fallback: string): string => {
  if (value === "") return fallback;
  return value;
};

type FormatPluginDiagnostic = (stage: PluginStage, error: unknown) => string;
export const formatPluginDiagnostic: FormatPluginDiagnostic = (
  stage,
  error,
) => {
  const errorClass = sanitizeDiagnosticText(
    readErrorClass(error),
    maxErrorClassLength,
  );

  const message = sanitizeDiagnosticText(
    readErrorMessage(error),
    maxDiagnosticLength,
  );

  return `pluginVersion=${PLUGIN_VERSION} stage=${stage} error=${fallbackDiagnosticValue(errorClass, "UnknownError")} message=${fallbackDiagnosticValue(message, "Unknown error")}`.slice(
    0,
    maxDiagnosticLength,
  );
};
