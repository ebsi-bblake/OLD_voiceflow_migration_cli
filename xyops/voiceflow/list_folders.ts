import { resolveVoiceflowAuth } from "./auth";
import { listFolders } from "./catalog";
import { failure, success } from "./contracts";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type ListFoldersResult = {
  options: Awaited<ReturnType<typeof listFolders>>;
};

type ListFoldersForWorkspace = (
  destinationWorkspaceID: string,
) => (
  auth: Parameters<typeof listFolders>[0],
) => ReturnType<typeof listFolders>;
const listFoldersForWorkspace: ListFoldersForWorkspace =
  (destinationWorkspaceID) => (auth) =>
    listFolders(auth, destinationWorkspaceID);

type Main = (
  token: string,
  destinationWorkspaceID: string,
) => Promise<Envelope<ListFoldersResult>>;
export const main: Main = (token, destinationWorkspaceID) => {
  const id = createUUID();
  return resolveVoiceflowAuth(token)
    .then(listFoldersForWorkspace(destinationWorkspaceID))
    .then((options) => success("list_folders", id, { options }))
    .catch((error) => failure("list_folders", id, error));
};
