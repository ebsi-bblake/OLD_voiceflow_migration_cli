import { z } from "zod";

const recordSchema = z.record(z.string(), z.unknown());
const frameTail = z.unknown();
const safeInteger = z.number().refine(Number.isSafeInteger);
const boundedErrorCode = z.string().min(1).max(80);

/** Known Logux tuple shapes; action payload semantics remain operation policies. */
export const LoguxFrameSchema = z.union([
  z
    .tuple([
      z.literal("connect"),
      safeInteger,
      z.string().min(1),
      safeInteger,
      recordSchema,
    ])
    .rest(frameTail),
  z
    .tuple([
      z.literal("connected"),
      safeInteger,
      z.string().min(1),
      z.array(z.unknown()),
      recordSchema,
    ])
    .rest(frameTail),
  z.tuple([z.literal("sync"), safeInteger, recordSchema]).rest(frameTail),
  z.tuple([z.literal("synced"), safeInteger]).rest(frameTail),
  z.tuple([z.literal("error"), boundedErrorCode]).rest(frameTail),
  z.tuple([z.literal("ping"), safeInteger]).rest(frameTail),
  z.tuple([z.literal("pong"), safeInteger]).rest(frameTail),
]);
