import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { AuthContext } from "../xyops/voiceflow/auth";
import { syncCatalog as importedSyncCatalog } from "../xyops/voiceflow/logux";

const originalSyncCatalog = importedSyncCatalog;

const catalogTypes = [
  "workspace.CRUD:REPLACE",
  "project.CRUD:REPLACE",
  "assistant.REPLACE",
  "workspace-folder.REPLACE",
] as const;

type CatalogType = (typeof catalogTypes)[number];
type CatalogRequest = Readonly<{
  channel: string;
  wanted: readonly string[];
}>;

const catalogRows: Record<CatalogType, unknown[]> = {
  "workspace.CRUD:REPLACE": [],
  "project.CRUD:REPLACE": [],
  "assistant.REPLACE": [],
  "workspace-folder.REPLACE": [],
};
const catalogRequests: CatalogRequest[] = [];

function isCatalogType(value: string | undefined): value is CatalogType {
  return catalogTypes.some((catalogType) => catalogType === value);
}

function setCatalogRows(type: CatalogType, rows: readonly unknown[]): void {
  catalogRows[type] = [...rows];
}

const syncCatalog = mock(
  async (_auth: AuthContext, channel: string, wanted: string[]) => {
    const type = wanted[0];
    if (!isCatalogType(type)) throw new Error(`Unexpected catalog type: ${type}`);
    catalogRequests.push({ channel, wanted: [...wanted] });
    return [...catalogRows[type]];
  },
);

// mock.restore() does not undo mock.module(). Preserve and reinstall the real
// export so older Bun runners cannot leak this file's transport double.
mock.module("../xyops/voiceflow/logux", () => ({ syncCatalog }));

const {
  folderOptions,
  loadFolders,
  loadProjects,
  loadWorkspaces,
  projectOptions,
  versionOptions,
  workspaceOptions,
} = await import("../xyops/voiceflow/catalog");

const auth: AuthContext = { creatorID: "creator-1", token: "token" };

beforeEach(() => {
  for (const type of catalogTypes) catalogRows[type] = [];
  catalogRequests.length = 0;
  syncCatalog.mockClear();
});

afterAll(() => {
  mock.module("../xyops/voiceflow/logux", () => ({
    syncCatalog: originalSyncCatalog,
  }));
});

describe("catalog raw-boundary projection", () => {
  test("normalizes workspace aliases and label fallbacks while omitting malformed rows", async () => {
    setCatalogRows("workspace.CRUD:REPLACE", [
      { id: " workspace-z ", name: " Zulu Workspace " },
      { _id: 2, name: " ", title: " Alpha Workspace " },
      { id: "workspace-b", name: "", title: " ", label: " Beta Workspace " },
      { _id: "Delta" },
      { id: "   ", name: "Blank ID" },
      { _id: " ", name: "Blank alias" },
      { name: "Missing ID" },
      null,
      "malformed",
      17,
      [],
    ]);

    const workspaces = await loadWorkspaces(auth);

    expect(workspaces).toEqual([
      { id: "workspace-z", label: "Zulu Workspace" },
      { id: "2", label: "Alpha Workspace" },
      { id: "workspace-b", label: "Beta Workspace" },
      { id: "Delta", label: "Delta" },
    ]);
    expect(workspaceOptions(workspaces)).toEqual([
      { value: "2", label: "Alpha Workspace" },
      { value: "workspace-b", label: "Beta Workspace" },
      { value: "Delta", label: "Delta" },
      { value: "workspace-z", label: "Zulu Workspace" },
    ]);
    expect(catalogRequests).toEqual([
      {
        channel: "creator/creator-1",
        wanted: ["workspace.CRUD:REPLACE"],
      },
    ]);
  });

  test("projects tolerate raw environment arrays and maps before workspace filtering", async () => {
    setCatalogRows("project.CRUD:REPLACE", [
      {
        _id: 200,
        workspaceID: 42,
        name: " Zulu Project ",
        environments: [
          {
            name: "Beta",
            draftVersionID: "draft-beta",
            publishedVersionID: 202,
          },
          "malformed",
          null,
          { title: "Alpha", draftVersionID: 101 },
          [],
          { label: "Gamma", publishedVersionID: "published-gamma" },
          { draftVersionID: "draft-default" },
        ],
      },
      {
        id: "project-map",
        workspaceID: "42",
        title: "Alpha Project",
        environments: {
          staging: { label: "Staging", publishedVersionID: 302 },
          malformed: "omit",
          development: { name: "Development", draftVersionID: 301 },
          absent: null,
        },
      },
      {
        id: "project-label",
        workspaceID: "42",
        name: " ",
        title: "",
        label: "Beta Project",
        environments: [],
      },
      { id: "Delta", workspaceID: "42", environments: [] },
      {
        id: "other-project",
        workspaceID: "other-workspace",
        label: "Aardvark Other Workspace",
        environments: [],
      },
      { id: "missing-workspace", environments: [] },
      { id: "blank-workspace", workspaceID: " ", environments: [] },
      { workspaceID: "42", environments: [] },
      { id: " ", workspaceID: "42", environments: [] },
      null,
      "malformed",
      9,
      [],
    ]);

    const projects = await loadProjects(auth, " 42 ");

    expect(projects).toEqual([
      {
        id: "200",
        label: "Zulu Project",
        workspaceID: "42",
        environments: [
          {
            label: "Beta",
            draftVersionID: "draft-beta",
            publishedVersionID: "202",
          },
          { label: "Alpha", draftVersionID: "101" },
          { label: "Gamma", publishedVersionID: "published-gamma" },
          { label: "Environment", draftVersionID: "draft-default" },
        ],
      },
      {
        id: "project-map",
        label: "Alpha Project",
        workspaceID: "42",
        environments: [
          { label: "Staging", publishedVersionID: "302" },
          { label: "Development", draftVersionID: "301" },
        ],
      },
      {
        id: "project-label",
        label: "Beta Project",
        workspaceID: "42",
        environments: [],
      },
      { id: "Delta", label: "Delta", workspaceID: "42", environments: [] },
      {
        id: "other-project",
        label: "Aardvark Other Workspace",
        workspaceID: "other-workspace",
        environments: [],
      },
    ]);
    expect(projectOptions("42")(projects)).toEqual([
      { value: "project-map", label: "Alpha Project (project-map)" },
      { value: "project-label", label: "Beta Project (project-label)" },
      { value: "Delta", label: "Delta (Delta)" },
      { value: "200", label: "Zulu Project (200)" },
    ]);
    expect(catalogRequests).toEqual([
      { channel: "workspace/42", wanted: ["project.CRUD:REPLACE"] },
      { channel: "workspace/42", wanted: ["assistant.REPLACE"] },
    ]);
  });

  test("assistant catalog reconciles folder IDs onto project catalog rows", async () => {
    setCatalogRows("project.CRUD:REPLACE", [
      {
        id: "project-a",
        workspaceID: "42",
        name: "Customer Assistant",
        environments: [],
      },
      {
        id: "project-b",
        workspaceID: "42",
        name: "Unassigned Assistant",
        environments: [],
      },
    ]);
    setCatalogRows("assistant.REPLACE", [
      { id: "project-a", workspaceID: "42", name: "Customer Assistant", folderID: 84 },
    ]);

    expect(await loadProjects(auth, "42")).toEqual([
      {
        id: "project-a",
        label: "Customer Assistant",
        workspaceID: "42",
        folderID: "84",
        environments: [],
      },
      {
        id: "project-b",
        label: "Unassigned Assistant",
        workspaceID: "42",
        environments: [],
      },
    ]);
  });

  test("project options include folder context while preserving canonical IDs", () => {
    const projects = [
      { id: "project-a", label: "Customer Assistant", workspaceID: "42", folderID: "folder-a", environments: [] },
      { id: "project-b", label: "Customer Assistant", workspaceID: "42", folderID: "folder-b", environments: [] },
      { id: "project-c", label: "Benefits Assistant", workspaceID: "42", environments: [] },
    ];
    const folders = [
      { id: "folder-a", label: "Participant Assistants", workspaceID: "42", parentID: undefined },
      { id: "folder-b", label: "Benefits", workspaceID: "42", parentID: undefined },
    ];

    expect(projectOptions("42", folders)(projects)).toEqual([
      { value: "project-c", label: "Benefits Assistant (project-c)" },
      { value: "project-b", label: "Benefits/Customer Assistant (project-b)" },
      { value: "project-a", label: "Participant Assistants/Customer Assistant (project-a)" },
    ]);
  });

  test("version options use draft and published labels in deterministic label order", async () => {
    setCatalogRows("project.CRUD:REPLACE", [
      {
        _id: 200,
        workspaceID: 42,
        name: "Zulu Project",
        environments: [
          {
            name: "Beta",
            draftVersionID: "draft-beta",
            publishedVersionID: 202,
          },
          { title: "Alpha", draftVersionID: 101 },
          { label: "Gamma", publishedVersionID: "published-gamma" },
          { draftVersionID: "draft-default" },
        ],
      },
    ]);

    const projects = await loadProjects(auth, "42");

    expect(versionOptions("42", "200")(projects)).toEqual([
      { value: "101", label: "[Draft] Zulu Project — Alpha" },
      { value: "draft-beta", label: "[Draft] Zulu Project — Beta" },
      {
        value: "draft-default",
        label: "[Draft] Zulu Project — Environment",
      },
      { value: "202", label: "[Published] Zulu Project — Beta" },
      {
        value: "published-gamma",
        label: "[Published] Zulu Project — Gamma",
      },
    ]);
  });

  test("folders retain numeric aliases and omit invalid raw records before workspace filtering", async () => {
    setCatalogRows("workspace-folder.REPLACE", [
      { id: 20, workspaceID: 42, name: "Zulu Folder" },
      { _id: "007", workspaceID: "42", title: "Alpha Folder" },
      { id: "project-id", workspaceID: "42", label: "Project" },
      { _id: "7x", workspaceID: "42", label: "Nonnumeric" },
      { id: 88, workspaceID: "other-workspace", label: "Other Folder" },
      { id: "", workspaceID: "42", label: "Blank ID" },
      { workspaceID: "42", label: "Missing ID" },
      { id: 99, label: "Missing Workspace" },
      { id: 100, workspaceID: " ", label: "Blank Workspace" },
      null,
      "malformed",
      11,
      [],
    ]);

    const folders = await loadFolders(auth, " 42 ");

    expect(folders).toEqual([
      { id: "20", label: "Zulu Folder", workspaceID: "42" },
      { id: "007", label: "Alpha Folder", workspaceID: "42" },
      { id: "88", label: "Other Folder", workspaceID: "other-workspace" },
    ]);
    expect(folderOptions("42")(folders)).toEqual([
      { value: "007", label: "Alpha Folder" },
      { value: "20", label: "Zulu Folder" },
    ]);
    expect(catalogRequests).toEqual([
      { channel: "workspace/42", wanted: ["workspace-folder.REPLACE"] },
    ]);
  });
});
