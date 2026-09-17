import { z } from "zod";

const recordSchema = z.record(z.string(), z.unknown());
const frameTail = z.unknown();

/** Known Logux tuple shapes; action payload semantics remain operation policies. */
export const LoguxFrameSchema = z.union([
  z.tuple([
    z.literal("connect"),
    z.number(),
    z.string(),
    z.number(),
    recordSchema,
  ]).rest(frameTail),
  z.tuple([
    z.literal("connected"),
    z.number(),
    z.string(),
    z.array(z.unknown()),
    recordSchema,
  ]).rest(frameTail),
  z.tuple([z.literal("sync"), z.number(), recordSchema]).rest(frameTail),
  z.tuple([z.literal("synced"), z.number()]).rest(frameTail),
  z.tuple([z.literal("error"), z.string()]).rest(frameTail),
  z.tuple([z.literal("ping"), z.number()]).rest(frameTail),
  z.tuple([z.literal("pong"), z.number()]).rest(frameTail),
]);
