import { z } from "zod";

/** Export payload must be a JSON object before version metadata policy runs. */
export const ExportPayloadSchema = z.record(z.string(), z.unknown());
