import packageMetadata from "../../package.json";

type PackageMetadata = Readonly<{
  version: string;
  pluginVersion: string;
}>;

const metadata: PackageMetadata = packageMetadata;

/** The CLI/release version is package.json.version; the plugin has its own lifecycle. */
export const CLI_VERSION = metadata.version;
export const PLUGIN_VERSION = metadata.pluginVersion;
