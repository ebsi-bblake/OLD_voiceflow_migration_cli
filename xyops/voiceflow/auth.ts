import { OperationFault } from "./contracts";
import { VoiceflowRegex } from "./regex";
import { isClaims, isValidCreatorID } from "./guards";
import type { AuthContext } from "./types";

type Claims = Readonly<Record<string, unknown>>;
export type { AuthContext } from "./types";

type NormalizeVoiceflowToken = (input: unknown) => string;
const isJWT = (token: string): boolean => token.split(".").length === 3;
const normalizeVoiceflowToken: NormalizeVoiceflowToken = (input) => {
  if (typeof input !== "string")
    throw new OperationFault("AUTHENTICATION_FAILED");
  const token = input.trim().replace(VoiceflowRegex.bearerPrefix, "").trim();
  validateTokenShape(token);
  return token;
};
const validateTokenShape = (token: string): void => {
  if (!token) throw new OperationFault("AUTHENTICATION_FAILED");
  validateJWT(token);
};
const validateJWT = (token: string): void => {
  if (!isJWT(token)) throw new OperationFault("AUTHENTICATION_FAILED");
};

type DecodeClaims = (token: string) => Claims;
const decodeClaims: DecodeClaims = (token) => {
  try {
    const part = token.split(".")[1];
    const normalizedPart = part
      .replace(VoiceflowRegex.base64UrlDash, "+")
      .replace(VoiceflowRegex.base64UrlUnderscore, "/");
    const padded = normalizedPart.padEnd(
      Math.ceil(normalizedPart.length / 4) * 4,
      "=",
    );
    const value: unknown = JSON.parse(
      Buffer.from(padded, "base64").toString("utf8"),
    );
    return requireClaims(value);
  } catch {
    throw new OperationFault("AUTHENTICATION_FAILED");
  }
};
const requireClaims = (value: unknown): Claims => {
  if (!isClaims(value)) throw new Error();
  return value;
};

type ExtractCreatorID = (claims: Claims) => string;
const extractCreatorID: ExtractCreatorID = (claims) => {
  const value = [
    claims.creatorID,
    claims.userID,
    claims.user_id,
    claims.sub,
  ].find((candidate) => candidate !== undefined);
  return validatedCreatorID(value);
};
const validatedCreatorID = (value: unknown): string => {
  if (!isCreatorIDValue(value))
    throw new OperationFault("AUTHENTICATION_FAILED");
  const rawCreatorID = String(value);
  validateCreatorID(rawCreatorID);
  return rawCreatorID.trim();
};
const isCreatorIDValue = (value: unknown): value is string | number =>
  typeof value === "string" || typeof value === "number";
const validateCreatorID = (value: string): void => {
  if (!isValidCreatorID(value))
    throw new OperationFault("AUTHENTICATION_FAILED");
};

type AuthContextFromToken = (token: string) => AuthContext;
const authContextFromToken: AuthContextFromToken = (token) => ({
  token,
  creatorID: extractCreatorID(decodeClaims(token)),
});

type AcquireVoiceflowToken = (input: unknown) => Promise<string>;
const acquireVoiceflowToken: AcquireVoiceflowToken = (input) =>
  Promise.resolve().then(() => normalizeVoiceflowToken(input));

type ResolveVoiceflowAuth = (input: unknown) => Promise<AuthContext>;
export const resolveVoiceflowAuth: ResolveVoiceflowAuth = (input) =>
  acquireVoiceflowToken(input).then(authContextFromToken);
