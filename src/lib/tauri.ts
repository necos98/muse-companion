import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  DownloadResult,
  InstallResult,
  UpdateConfig,
  UpdateStatus,
} from "./updater";

export interface Workspace {
  id: string;
  name: string;
  kind: "windows" | "wsl";
  path: string;
  distro?: string | null;
  shell?: string | null;
  created_at: number;
}

export interface PtyOutputEvent {
  session_id: number;
  data: string;
}

export interface PtyExitEvent {
  session_id: number;
}

export interface NewWorkspace {
  name: string;
  kind: "windows" | "wsl";
  path: string;
  distro?: string;
  shell?: string;
}

export const api = {
  listWorkspaces: () => invoke<Workspace[]>("list_workspaces"),

  addWorkspace: (w: NewWorkspace) =>
    invoke<Workspace>("add_workspace", {
      name: w.name,
      kind: w.kind,
      path: w.path,
      distro: w.distro ?? null,
      shell: w.shell && w.shell.trim() !== "" ? w.shell : null,
    }),

  renameWorkspace: (id: string, name: string) =>
    invoke<Workspace>("rename_workspace", { id, name }),

  removeWorkspace: (id: string) => invoke<void>("remove_workspace", { id }),

  listWslDistros: () => invoke<string[]>("list_wsl_distros"),

  checkWslPath: (distro: string, path: string) =>
    invoke<boolean>("check_wsl_path", { distro, path }),

  // Nota: Tauri v2 converte i nomi degli argomenti in camelCase
  // (workspace_id -> workspaceId): le chiavi qui devono esserlo già.
  ptySpawn: (workspaceId: string, cols: number, rows: number) =>
    invoke<number>("pty_spawn", { workspaceId, cols, rows }),

  ptyWrite: (sessionId: number, data: string) =>
    invoke<void>("pty_write", { sessionId, data }),

  ptyResize: (sessionId: number, cols: number, rows: number) =>
    invoke<void>("pty_resize", { sessionId, cols, rows }),

  ptyClose: (sessionId: number) => invoke<void>("pty_close", { sessionId }),

  // Updater GitHub Releases (backend: src-tauri/src/updater.rs).
  getUpdateConfig: () => invoke<UpdateConfig>("get_update_config"),

  checkUpdate: () => invoke<UpdateStatus>("check_update"),

  downloadUpdate: (assetName: string | null) =>
    invoke<DownloadResult>("download_update", { assetName }),

  installUpdate: (filePath: string, launch: boolean) =>
    invoke<InstallResult>("install_update", { filePath, launch }),
};

export function onPtyOutput(cb: (e: PtyOutputEvent) => void) {
  return listen<PtyOutputEvent>("pty-output", (event) => cb(event.payload));
}

export function onPtyExit(cb: (e: PtyExitEvent) => void) {
  return listen<PtyExitEvent>("pty-exit", (event) => cb(event.payload));
}
