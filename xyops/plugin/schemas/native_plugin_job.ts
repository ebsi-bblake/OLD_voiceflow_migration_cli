import { z } from "zod";
import { supportedPluginOperations } from "../operations";

export const PluginOperationSchema = z.enum(supportedPluginOperations);

export const NativePluginJobSchema = z
  .object({
    xy: z.literal(1),
    type: z.literal("event"),
    params: z.record(z.string(), z.unknown()),
  })
  .loose();

export type ParsedNativePluginJob = z.infer<typeof NativePluginJobSchema>;
