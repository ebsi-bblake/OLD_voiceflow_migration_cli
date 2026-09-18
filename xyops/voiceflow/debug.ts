export type DebugWriter = (line: string) => void;

type DebugConfiguration = Readonly<{
  readonly all: boolean;
  readonly names: ReadonlySet<string>;
  readonly writer: DebugWriter;
}>;

const defaultConfiguration: DebugConfiguration = {
  all: false,
  names: new Set(),
  writer: (line) => console.error(line),
};
let configuration: DebugConfiguration = defaultConfiguration;

type ConfigureDebug = (spec: unknown, writer?: DebugWriter) => void;
export const configureDebug: ConfigureDebug = (
  spec,
  writer = defaultConfiguration.writer,
) => {
  const names =
    typeof spec === "string"
      ? new Set(
          spec
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean),
        )
      : new Set<string>();
  configuration = {
    all: spec === true || spec === "*" || names.has("*"),
    names,
    writer,
  };
};

type IsDebugEnabled = (name: string) => boolean;
const isDebugEnabled: IsDebugEnabled = (name) =>
  configuration.all ||
  [...configuration.names].some(
    (selected) =>
      name === selected ||
      name.startsWith(`${selected}.`) ||
      name.startsWith(`${selected}-`),
  );

type DebugLog = (
  name: string,
  event: string,
  fields?: Readonly<Record<string, unknown>>,
) => void;
export const debugLog: DebugLog = (name, event, fields = {}) => {
  if (!isDebugEnabled(name)) return;
  configuration.writer(
    `[debug:${name}] ${JSON.stringify({ event, ...fields })}`,
  );
};

export const isDebugSelector = (value: unknown): value is string | true =>
  value === true || typeof value === "string";
