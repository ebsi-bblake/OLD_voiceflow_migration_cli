import { Temporal } from "@js-temporal/polyfill";
import { OperationFault } from "./contracts";
import type { ProjectRecord } from "./types";

export type ArchiveClock = Readonly<{ now: () => Date }>;
export type ArchiveCandidate = Readonly<{
  project: ProjectRecord;
  name: string;
}>;

const archiveTimestamp = (date: Date): string => {
  const localDateTime = Temporal.Instant.fromEpochMilliseconds(
    date.getTime(),
  ).toZonedDateTimeISO(Temporal.Now.timeZoneId());
  const part = (value: number): string => String(value).padStart(2, "0");
  return `${localDateTime.year}${part(localDateTime.month)}${part(localDateTime.day)}_${part(localDateTime.hour)}${part(localDateTime.minute)}`;
};

export const archiveName = (sourceName: string, date: Date): string =>
  `${sourceName}_${archiveTimestamp(date)}`;

const nextAvailableName = (
  baseName: string,
  existingNames: ReadonlySet<string>,
  suffix: number,
): string | undefined => {
  const candidate = suffix === 0 ? baseName : `${baseName}_${suffix}`;
  return existingNames.has(candidate)
    ? suffix >= 100
      ? undefined
      : nextAvailableName(baseName, existingNames, suffix + 1)
    : candidate;
};

type FindArchiveCandidate = (
  projects: readonly ProjectRecord[],
  workspaceID: string,
  folderID: string,
  sourceName: string,
  clock: ArchiveClock,
) => ArchiveCandidate | undefined;
export const findArchiveCandidate: FindArchiveCandidate = (
  projects,
  workspaceID,
  folderID,
  sourceName,
  clock,
) => {
  const inDestination = projects.filter(
    (project) =>
      project.workspaceID === workspaceID && project.folderID === folderID,
  );
  const collision = inDestination.find(
    (project) => project.label === sourceName,
  );
  if (collision === undefined) return undefined;
  const existingNames = new Set(inDestination.map((project) => project.label));
  const baseName = archiveName(sourceName, clock.now());
  const name = nextAvailableName(baseName, existingNames, 0);
  if (name === undefined)
    throw new OperationFault(
      "INVALID_ARGUMENT",
      false,
      "unable to obtain a unique archive name",
    );
  return { project: collision, name };
};
