import { parsePluginJob } from "./job_validation";
import type { NativePluginJob, PluginInput } from "./types";
export type { PluginInput, PluginInputChunk } from "./types";

type DecodePluginChunk = (
  chunk: Uint8Array | string,
  decoder: TextDecoder,
) => string;
const decodePluginChunk: DecodePluginChunk = (chunk, decoder) =>
  typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });

type ReadPluginInput = (input: PluginInput) => Promise<string>;
export const readPluginInput: ReadPluginInput = async (input) => {
  const decoder = new TextDecoder();
  let value = "";
  for await (const chunk of input) {
    value += decodePluginChunk(chunk, decoder);
  }
  return value + decoder.decode();
};

type ReadPluginJob = (input: PluginInput) => Promise<NativePluginJob>;
export const readPluginJob: ReadPluginJob = (input) =>
  readPluginInput(input).then(parsePluginJob);
