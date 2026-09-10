import { resolveVoiceflowAuth } from "./auth";
import { failure, success } from "./contracts";
import { createFolder } from "./logux/create-folder";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type CreateFolderResult = Readonly<{
  folder: Readonly<{ value: string; label: string }>;
}>;
type Main = (
  token: string,
  workspaceID: string,
  folderName: string,
) => Promise<Envelope<CreateFolderResult>>;
export const main: Main = async (token, workspaceID, folderName) => {
  const id = createUUID();
  return resolveVoiceflowAuth(token)
    .then((auth) => createFolder(auth, workspaceID, folderName))
    .then((folder) =>
      success("create_folder", id, {
        folder: { value: folder.id, label: folder.name },
      }),
    )
    .catch((error) => failure("create_folder", id, error));
};
