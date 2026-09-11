import type { Option } from "./types";

export type PromptLifecycle = Readonly<{
  beforeAsk: () => void;
  afterAsk: () => void;
}>;

export type PromptReader = Readonly<{
  ask: (question: string) => Promise<string>;
  close: () => void;
}>;

type ReadStringChunk = (chunk: unknown) => string | undefined;
const readStringChunk: ReadStringChunk = (chunk) =>
  typeof chunk === "string" ? chunk : undefined;

type ReadBytesChunk = (
  chunk: unknown,
  decoder: TextDecoder,
) => string | undefined;
const readBytesChunk: ReadBytesChunk = (chunk, decoder) =>
  chunk instanceof Uint8Array
    ? decoder.decode(chunk, { stream: true })
    : undefined;

type FirstDefined = (values: readonly (string | undefined)[]) => string;
const firstDefined: FirstDefined = (values) =>
  values.find((value) => value !== undefined) ?? "";

type ReadChunk = (chunk: unknown, decoder: TextDecoder) => string;
const readChunk: ReadChunk = (chunk, decoder) =>
  firstDefined([readStringChunk(chunk), readBytesChunk(chunk, decoder)]);

type Newline = Readonly<{
  index: number;
  end: number;
}>;

type NewlineEnd = (buffer: string, index: number) => number;
const newlineEnd: NewlineEnd = (buffer, index) =>
  index + (Number(buffer.startsWith("\r\n", index)) + 1);

type FindNewline = (buffer: string) => Newline | undefined;
const findNewline: FindNewline = (buffer) => {
  const indices = [buffer.indexOf("\r"), buffer.indexOf("\n")].filter(
    (index) => index >= 0,
  );

  if (!indices.length) return undefined;

  const index = Math.min(...indices);

  return {
    index,
    end: newlineEnd(buffer, index),
  };
};

type CreatePromptReader = (lifecycle?: PromptLifecycle) => PromptReader;
export const CreatePromptReader: CreatePromptReader = (lifecycle) => {
  const input = process.stdin;
  const decoder = new TextDecoder();

  let buffer = "";
  let waiting: ((line: string) => void) | undefined;
  let listening = false;

  type ResolveWaitingLine = (resolve: (line: string) => void) => void;
  const resolveWaitingLine: ResolveWaitingLine = (resolve) => {
    const newline = findNewline(buffer);

    if (newline === undefined) return;

    const line = buffer.slice(0, newline.index);

    buffer = buffer.slice(newline.end);
    waiting = undefined;

    lifecycle?.afterAsk();
    resolve(line);
  };

  type ResolveLineIfReady = () => void;
  const resolveLineIfReady: ResolveLineIfReady = () => {
    const resolve = waiting;

    if (!resolve) return;

    resolveWaitingLine(resolve);
  };

  type OnData = (chunk: unknown) => void;
  const onData: OnData = (chunk) => {
    buffer += readChunk(chunk, decoder);
    resolveLineIfReady();
  };

  type Ask = (question: string) => Promise<string>;
  const ask: Ask = (question) => {
    if (waiting) {
      return Promise.reject(
        new Error("\nA prompt is already waiting for input"),
      );
    }

    lifecycle?.beforeAsk();
    process.stdout.write(question);

    return new Promise((resolve) => {
      waiting = resolve;
      resolveLineIfReady();
    });
  };

  type Close = () => void;
  const close: Close = () => {
    if (listening) input.off("data", onData);

    listening = false;
    input.pause();
  };

  input.on("data", onData);
  listening = true;
  input.resume();

  return {
    ask,
    close,
  };
};

type Bounded = (value: unknown, max?: number) => string;
export const bounded: Bounded = (value, max = 200) =>
  truncateText(sanitizeText(stringifyValue(value)), max);

type IsControlCharacter = (character: string) => boolean;
const isControlCharacter: IsControlCharacter = (character) => {
  const code = character.charCodeAt(0);

  return code < 32 || code === 127;
};

type StringifyFallback = (value: unknown) => string;
const stringifyFallback: StringifyFallback = (value) =>
  JSON.stringify(value) ?? String(value);

type StringifyValue = (value: unknown) => string;
const stringifyValue: StringifyValue = (value) =>
  typeof value === "string" ? value : stringifyFallback(value);

type SanitizeText = (text: string) => string;
const sanitizeText: SanitizeText = (text) =>
  [...text]
    .map((character) => (isControlCharacter(character) ? " " : character))
    .join("");

type TruncateText = (text: string, max: number) => string;
const truncateText: TruncateText = (text, max) =>
  text.length > max ? `${text.slice(0, max)}…` : text;

type IsOptionNumber = (number: number, length: number) => boolean;
const isOptionNumber: IsOptionNumber = (number, length) =>
  number >= 1 && number <= length;

type RequireOptions = (
  title: string,
  options: readonly Option[],
) => readonly Option[];
const requireOptions: RequireOptions = (title, options) => {
  if (!options.length) {
    throw new Error(`\nNo ${title.toLowerCase()} options were returned.`);
  }

  return options;
};

type ReadOption = (
  reader: PromptReader,
  title: string,
  options: readonly Option[],
) => Promise<string>;
const readOption: ReadOption = (reader, title, options) =>
  reader.ask("Select number: ").then((answer) => {
    const number = Number.parseInt(answer, 10);

    if (isOptionNumber(number, options.length)) {
      return options[number - 1].value;
    }

    console.log("\nPlease select one of the displayed numbers.");

    return chooseOption(reader, title, options);
  });

type FormatOptionForPrompt = (option: Option) => string;
const formatOptionForPrompt: FormatOptionForPrompt = (option) =>
  option.label.endsWith(` (${option.value})`)
    ? bounded(option.label)
    : `${bounded(option.label)} (${bounded(option.value, 100)})`;

type ChooseOption = (
  reader: PromptReader,
  title: string,
  options: readonly Option[],
) => Promise<string>;
export const chooseOption: ChooseOption = async (reader, title, options) => {
  const validOptions = requireOptions(title, options);

  console.log(`\n${title}:`);

  validOptions.forEach((option, index) =>
    console.log(`${index + 1}. ${formatOptionForPrompt(option)}`),
  );

  return readOption(reader, title, validOptions);
};
