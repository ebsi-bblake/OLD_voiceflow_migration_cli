import type { AuthContext, ProjectRecord } from "../types";
import { OperationFault } from "../contracts";
import { loadProjects } from "./options";

const MAX_CONFIRMATION_ATTEMPTS = 5;
const CONFIRMATION_INTERVAL_MS = 250;

type ProjectState = Readonly<{
  workspaceID: string;
  folderID: string;
  projectID: string;
  name: string;
}>;

type IsExpectedProject = (
  project: ProjectRecord | undefined,
  state: ProjectState,
) => boolean;
const isExpectedProject: IsExpectedProject = (project, state) =>
  project?.id === state.projectID &&
  project.workspaceID === state.workspaceID &&
  project.folderID === state.folderID &&
  project.label === state.name;

type ConfirmProjectRename = (
  auth: AuthContext,
  state: ProjectState,
) => Promise<void>;
export const confirmProjectRename: ConfirmProjectRename = async (auth, state) => {
  for (let attempt = 0; attempt < MAX_CONFIRMATION_ATTEMPTS; attempt += 1) {
    try {
      const projects = await loadProjects(auth, state.workspaceID);
      const project = projects.find((candidate) => candidate.id === state.projectID);
      if (isExpectedProject(project, state)) return;
    } catch {
      // Retry transient catalog and WebSocket failures.
    }
    if (attempt < MAX_CONFIRMATION_ATTEMPTS - 1)
      await new Promise<void>((resolve) =>
        setTimeout(resolve, CONFIRMATION_INTERVAL_MS),
      );
  }
  throw new OperationFault(
    "DEPENDENCY_TIMEOUT",
    true,
    "archive-durability rename state was not confirmed",
  );
};
