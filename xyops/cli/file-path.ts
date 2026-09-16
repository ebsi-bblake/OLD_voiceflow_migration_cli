type ResolveConfiguredFilePath = (
  configuredPath: string,
  platform: NodeJS.Platform,
) => string;

/** Converts shared Windows paths to their mounted macOS volume when needed. */
export const resolveConfiguredFilePath: ResolveConfiguredFilePath = (
  configuredPath,
  platform,
) => {
  if (platform !== "darwin") return configuredPath;
  const normalizedPath = configuredPath.replaceAll("\\", "/");
  const match = normalizedPath.match(/^\/\/[^/]+\/([^/]+)(\/.*)?$/);
  return match === null
    ? configuredPath
    : `/Volumes/${match[1]}${match[2] ?? ""}`;
};
