import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import Sidebar from "./components/Sidebar";
import AddWorkspaceDialog from "./components/AddWorkspaceDialog";
import TerminalView from "./components/TerminalView";
import UpdateCheck from "./components/UpdateCheck";
import { api } from "./lib/tauri";
import type { Workspace } from "./lib/tauri";
import { cn } from "./lib/utils";

interface Tab {
  key: string;
  workspace: Workspace;
}

function newTabKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export default function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    api
      .listWorkspaces()
      .then((ws) => {
        setWorkspaces(ws);
        setLoading(false);
      })
      .catch((e) => {
        setLoadError(String(e));
        setLoading(false);
      });
  }, []);

  // Se il tab attivo viene chiuso, passa all'ultimo rimasto.
  useEffect(() => {
    if (activeKey && !tabs.some((t) => t.key === activeKey)) {
      setActiveKey(tabs.length > 0 ? tabs[tabs.length - 1].key : null);
    }
  }, [tabs, activeKey]);

  const spawnTab = useCallback((ws: Workspace) => {
    const key = newTabKey();
    setTabs((prev) => [...prev, { key, workspace: ws }]);
    setActiveKey(key);
  }, []);

  const closeTab = useCallback((key: string) => {
    setTabs((prev) => prev.filter((t) => t.key !== key));
  }, []);

  const handleAdded = useCallback((ws: Workspace) => {
    setWorkspaces((prev) => [...prev, ws]);
  }, []);

  const handleRename = useCallback(async (id: string, name: string) => {
    const updated = await api.renameWorkspace(id, name);
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? updated : w)));
    setTabs((prev) =>
      prev.map((t) => (t.workspace.id === id ? { ...t, workspace: updated } : t)),
    );
  }, []);

  const handleRemove = useCallback(async (id: string) => {
    await api.removeWorkspace(id);
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return (
    <div className="flex h-screen">
      <aside className="flex w-[300px] min-w-[260px] max-w-[340px] flex-col overflow-hidden border-r bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Caricamento…
          </div>
        ) : loadError ? (
          <div className="p-4">
            <p className="text-[13px] text-destructive">{loadError}</p>
          </div>
        ) : (
          <Sidebar
            workspaces={workspaces}
            onSpawn={spawnTab}
            onRename={handleRename}
            onRemove={handleRemove}
            onAdd={() => setDialogOpen(true)}
          />
        )}
        <div className="border-t p-3">
          <UpdateCheck />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-shrink-0 items-center gap-1.5 overflow-x-auto border-b bg-card px-2.5 py-2">
          {tabs.length === 0 && (
            <span className="px-2 text-xs text-muted-foreground">
              Nessun terminale aperto
            </span>
          )}
          {tabs.map((t) => {
            const isActive = t.key === activeKey;
            return (
              <div
                key={t.key}
                onClick={() => setActiveKey(t.key)}
                className={cn(
                  "flex cursor-pointer select-none items-center gap-2 rounded-md border px-2.5 py-1.5",
                  isActive
                    ? "border-border bg-muted"
                    : "border-transparent hover:bg-accent",
                )}
              >
                <span
                  className={cn(
                    "whitespace-nowrap text-xs",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t.workspace.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(t.key);
                  }}
                  className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                  aria-label={`Chiudi ${t.workspace.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="relative min-h-0 flex-1">
          {tabs.length === 0 && (
            <div className="flex h-full items-center justify-center p-8">
              <p className="text-center text-sm text-muted-foreground">
                Premi “+ Terminale” su un workspace per aprire una shell integrata.
              </p>
            </div>
          )}
          {tabs.map((t) => (
            <TerminalView
              key={t.key}
              workspace={t.workspace}
              active={t.key === activeKey}
              onExit={() => closeTab(t.key)}
            />
          ))}
        </div>
      </div>

      <AddWorkspaceDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdded={handleAdded}
      />
    </div>
  );
}
