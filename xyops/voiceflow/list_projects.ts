import { resolveVoiceflowAuth } from "./auth";
import { listProjects } from "./catalog";
import { failure, success } from "./contracts";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type ListProjectsResult = {
  options: Awaited<ReturnType<typeof listProjects>>;
};

type ListProjectsForWorkspace = (
  sourceWorkspaceID: string,
) => (
  auth: Parameters<typeof listProjects>[0],
) => ReturnType<typeof listProjects>;
const listProjectsForWorkspace: ListProjectsForWorkspace =
  (sourceWorkspaceID) => (auth) =>
    listProjects(auth, sourceWorkspaceID);

type Main = (
  token: string,
  sourceWorkspaceID: string,
) => Promise<Envelope<ListProjectsResult>>;
export const main: Main = (token, sourceWorkspaceID) => {
  const id = createUUID();
  return resolveVoiceflowAuth(token)
    .then(listProjectsForWorkspace(sourceWorkspaceID))
    .then((options) => success("list_projects", id, { options }))
    .catch((error) => failure("list_projects", id, error));
};
