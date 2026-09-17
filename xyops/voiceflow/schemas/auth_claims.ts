import { z } from "zod";

const creatorClaimSchema = z.union([z.string(), z.number()]).optional();

/** Structural claim shape; creator precedence and identifier safety remain policies. */
export const VoiceflowAuthClaimsSchema = z
  .object({
    creatorID: creatorClaimSchema,
    userID: creatorClaimSchema,
    user_id: creatorClaimSchema,
    sub: creatorClaimSchema,
  })
  .loose();
