import { PLUGIN_VERSION } from "./version";
import { VoiceflowRegex } from "../voiceflow/regex";
import { PluginStage } from "./types";
export type { PluginStage } from "./types";

export const pluginStages = Object.values(PluginStage);

const maxDiagnosticLength = 320;
const maxErrorClassLength = 80;

const readErrorName = (error: unknown): string =>
  error instanceof Error ? error.name : "UnknownError";

const normalizeErrorName = (name: string): string =>
  name.trim() === "" ? "UnknownError" : name;

type ReadErrorClass = (error: unknown) => string;
const readErrorClass: ReadErrorClass = (error) =>
  normalizeErrorName(readErrorName(error));

const readErrorText = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown error";

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
