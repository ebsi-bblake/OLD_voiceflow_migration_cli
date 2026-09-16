import { createHash } from "crypto";
import type { MigrationSelection } from "../types";

type FormatPlanID = (bytes: Uint8Array) => string;
const formatPlanID: FormatPlanID = (bytes) =>
  [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);

type PlanID = (selection: MigrationSelection) => Promise<string>;
export const planID: PlanID = async (selection) => {
  const bytes = new TextEncoder().encode(JSON.stringify(selection));
  return Promise.resolve().then(() =>
    formatPlanID(createHash("sha256").update(bytes).digest()),
  );
};
