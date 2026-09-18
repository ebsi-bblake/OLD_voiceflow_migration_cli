import { PLUGIN_VERSION } from "./version";
import { OperationFault, toOperationError } from "../voiceflow/contracts";
import {
  appendDiagnosticCause,
  createDiagnostic,
  createUnexpectedDiagnostic,
} from "../diagnostics/create";

import { PluginStage } from "./types";
import type { Diagnostic } from "../diagnostics/types";
export type { PluginStage } from "./types";

export const pluginStages = Object.values(PluginStage);

type CreatePluginDiagnostic = (
  stage: PluginStage,
  error: unknown,
) => Diagnostic;
export const createPluginDiagnostic: CreatePluginDiagnostic = (
  stage,
  error,
) => {
  if (error instanceof OperationFault) {
    const coreDiagnostic = toOperationError(error).diagnostic;
    if (coreDiagnostic === undefined)
      return createUnexpectedDiagnostic(error, "plugin", stage);
    return appendDiagnosticCause(
      coreDiagnostic,
      createDiagnostic(
        { code: error.code, retryable: error.retryable },
        "plugin",
        stage,
      ).causes[0],
    );
  }
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
const compatibilityMessage = "Structured diagnostic available.";

type ReadErrorClass = (error: unknown) => string;
const readErrorClass: ReadErrorClass = (error) => {
  const name = error instanceof Error ? error.name : "UnknownError";
  return (
    name
      .split("")
      .map((character) => {
        const code = character.charCodeAt(0);
        return code <= 31 || code === 127 ? " " : character;
      })
      .join("")
      .trim()
      .slice(0, maxErrorClassLength) || "UnknownError"
  );
};

const readCompatibilityMessage = (error: unknown): string => {
  if (error instanceof Error && error.name === "PluginValidationFault")
    return error.message;
  return compatibilityMessage;
};

type FormatPluginDiagnostic = (stage: PluginStage, error: unknown) => string;
export const formatPluginDiagnostic: FormatPluginDiagnostic = (
  stage,
  error,
) => {
  const diagnostic = createPluginDiagnostic(stage, error);
  const errorClass = readErrorClass(error);
  const message = readCompatibilityMessage(error);
  if (error instanceof Error && error.name === "PluginValidationFault")
    return `pluginVersion=${PLUGIN_VERSION} stage=${stage} error=${errorClass} message=${message}`;
  return `pluginVersion=${PLUGIN_VERSION} stage=${stage} error=${errorClass} message=${message} code=${diagnostic.code} domain=${diagnostic.domain} retryable=${diagnostic.retryable} causes=${diagnostic.causes.length}`.slice(
    0,
    maxDiagnosticLength,
  );
};
