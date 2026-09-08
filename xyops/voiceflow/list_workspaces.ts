import { listWorkspaces } from "./catalog";
import { resolveVoiceflowAuth } from "./auth";
import { success, failure } from "./contracts";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type ListWorkspacesResult = {
  options: Awaited<ReturnType<typeof listWorkspaces>>;
};

type Main = (token: string) => Promise<Envelope<ListWorkspacesResult>>;
export const main: Main = async (token) => {
  const id = createUUID();
  return resolveVoiceflowAuth(token)
    .then(listWorkspaces)
    .then((options) => success("list_workspaces", id, { options }))
    .catch((error) => failure("list_workspaces", id, error));
};
