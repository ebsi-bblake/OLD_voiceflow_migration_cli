import { resolveVoiceflowAuth } from "./auth";
import { listVersions } from "./catalog";
import { failure, success } from "./contracts";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type ListVersionsResult = {
  options: Awaited<ReturnType<typeof listVersions>>;
};

type ListVersionsForSelection = (
  sourceWorkspaceID: string,
  sourceProjectID: string,
) => (
  auth: Parameters<typeof listVersions>[0],
) => ReturnType<typeof listVersions>;
const listVersionsForSelection: ListVersionsForSelection =
  (sourceWorkspaceID, sourceProjectID) => (auth) =>
    listVersions(auth, sourceWorkspaceID, sourceProjectID);

type Main = (
  token: string,
  sourceWorkspaceID: string,
  sourceProjectID: string,
) => Promise<Envelope<ListVersionsResult>>;
export const main: Main = (token, sourceWorkspaceID, sourceProjectID) => {
  const id = createUUID();
  return resolveVoiceflowAuth(token)
    .then(listVersionsForSelection(sourceWorkspaceID, sourceProjectID))
    .then((options) => success("list_versions", id, { options }))
    .catch((error) => failure("list_versions", id, error));
};
