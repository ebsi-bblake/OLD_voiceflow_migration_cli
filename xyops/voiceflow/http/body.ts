import { OperationFault } from "../contracts";

const rejectOversizedChunk = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  size: number,
  maxBytes: number,
): Promise<void> => {
  if (size > maxBytes) {
    await reader.cancel();
    throw new OperationFault("DEPENDENCY_FAILURE");
  }
};

type AssembleChunks = (
  chunks: readonly Uint8Array[],
  size: number,
) => ArrayBuffer;
const assembleChunks: AssembleChunks = (chunks, size) => {
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
};

type CollectChunks = (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  maxBytes: number,
  chunks: readonly Uint8Array[],
  size: number,
) => Promise<readonly Uint8Array[]>;
const collectChunks: CollectChunks = async (reader, maxBytes, chunks, size) => {
  const part = await reader.read();
  if (part.done) return chunks;
  const nextSize = size + part.value.byteLength;
  await rejectOversizedChunk(reader, nextSize, maxBytes);
  return collectChunks(reader, maxBytes, [...chunks, part.value], nextSize);
};

type ReadChunks = (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  maxBytes: number,
) => Promise<readonly Uint8Array[]>;
const readChunks: ReadChunks = (reader, maxBytes) =>
  collectChunks(reader, maxBytes, [], 0);

type ReadResponseBody = (
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
) => Promise<ArrayBuffer>;
export const readResponseBody: ReadResponseBody = async (body, maxBytes) => {
  const reader = body.getReader();
  try {
    const chunks = await readChunks(reader, maxBytes);
    return assembleChunks(
      chunks,
      chunks.reduce((size, chunk) => size + chunk.byteLength, 0),
    );
  } finally {
    reader.releaseLock();
  }
};
