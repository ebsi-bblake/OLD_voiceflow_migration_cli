/** Centralized regular expressions used by the Voiceflow and XYOps boundaries. */
export const VoiceflowRegex = {
  bearerPrefix: /^Bearer\s+/i,
  base64UrlDash: /-/g,
  base64UrlUnderscore: /_/g,
  // This range intentionally includes C0 and C1 control characters.
  // eslint-disable-next-line no-control-regex
  controlCharacter: new RegExp("[\\u0000-\\u009f]"),
  creatorID: /^[A-Za-z0-9_-]{1,128}$/,
  diagnosticStage: /stage=[a-z-]+/i,
  filename: /^[^/\\]+\.vf$/i,
  projectAPIKey: /^VF\.DM\..+/,
  pathSeparator: /[\\/]/,
  trailingSlashes: /\/+$/,
  voiceflowAPIKey: /VF\.DM\.[^\s"']+/gi,
  redactedBearer: /Bearer\s+[^\s]+/gi,
  redactedURL: /https?:\/\/[^\s"']+/gi,
  whitespace: /\s+/g,
  numericID: /^\d+$/,
  schemaVersion: /^\d+\.\d+$/,
  quotedSecretValue: /^(".*"|'.*')$/u,
  secretName: /^[A-Za-z_][A-Za-z0-9_]*$/,
  secretLineBreak: /\r?\n/,
  xyopsSensitiveField:
    /token|api[_-]?key|password|secret|authorization|credential|params?|output|data|activity|fields|env/i,
  sensitiveWord: /secret|token|password|credential|authorization|jwt/i,
  failureSensitiveDetail:
    /\b(?:api[\s_-]*key|access[\s_-]*token|password|secret|authorization|bearer|credential)\b/i,
  jwt: /\b(?:eyJ[A-Za-z0-9_-]+\.)[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  longSecretToken: /\b[A-Za-z0-9_-]{40,}\b/,
  nonPrintable: /[^\x20-\x7e]+/g,
  sseLineBreak: /\r\n|\n|\r/,
  sseFrameBreak: /(?:\r\n){2}|\n\n|\r\r/,
  sseLeadingSpace: /^ /,
  safeEndpoint: /[^a-zA-Z0-9/_-]/g,
  pluginLineBreak: /\r?\n/u,
  stackFrame: /^\s*at\s+/u,
  bearerValue: /\bBearer\s+[^\s,;}]+/giu,
  pluginJWT: /\b(?:eyJ[A-Za-z0-9_-]{4,}\.)[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu,
  sensitiveAssignment:
    /(["']?(?:api[ _-]?key|access[ _-]?token|refresh[ _-]?token|authorization|password|secret|token|jwt)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^,;}\s]+)/giu,
  dataAssignment:
    /(["']?(?:params?|payload|export(?:ed)?(?:data|base64)?)["']?\s*[:=]\s*)(?:\{[^\n]*\}|\[[^\n]*\]|[^,;}\s]+)/giu,
  structuredData: /\{[^\n]*\}|\[[^\n]*\]/gu,
  prefixedSecret:
    /\b(?:jwt|token|api[ _-]?key|sk|pk|vf)[_-][A-Za-z0-9_-]+\b/giu,
  pluginLongToken: /\b[A-Za-z0-9_-]{24,}\b/gu,
} as const;
