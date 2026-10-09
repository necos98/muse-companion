import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { Workspace } from "../lib/tauri";

interface Props {
  workspaces: Workspace[];
  onSpawn: (ws: Workspace) => void;
  onRename: (id: string, name: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onAdd: () => void;
}

export default function Sidebar({ workspaces, onSpawn, onRename, onRemove, onAdd }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (ws: Workspace) => {
    setError(null);
    setConfirmingId(null);
    setEditingId(ws.id);
    setEditingName(ws.name);
  };

  const saveEdit = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await onRename(id, editingName);
      setEditingId(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await onRemove(id);
      setConfirmingId(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
      <Button onClick={onAdd} className="w-full">
        <Plus />
        Aggiungi workspace
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {workspaces.length === 0 && (
          <p className="mt-3 text-[13px] text-muted-foreground">
            Nessun workspace. Aggiungi una cartella per iniziare.
          </p>
        )}

        {workspaces.map((ws) => (
          <div key={ws.id} className="rounded-lg border bg-card p-2.5">
            {editingId === ws.id ? (
              <div className="flex flex-col gap-2">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Nome workspace"
                  autoFocus
                  className="h-8 text-[13px]"
                />
                <div className="flex flex-row gap-1.5">
                  <Button
                    size="sm"
                    disabled={busyId === ws.id}
                    onClick={() => void saveEdit(ws.id)}
                  >
                    Salva
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingId(null)}
                  >
                    Annulla
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {ws.name}
                  </span>
                  <Badge variant={ws.kind === "wsl" ? "default" : "secondary"}>
                    {ws.kind === "wsl" ? (ws.distro ?? "WSL") : "WIN"}
                  </Badge>
                </div>

                <p className="truncate text-xs text-muted-foreground">{ws.path}</p>

                {confirmingId === ws.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="flex-1 text-xs">Rimuovere?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === ws.id}
                      onClick={() => void confirmRemove(ws.id)}
                    >
                      Sì
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setConfirmingId(null)}
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-row gap-1.5">
                    <Button size="sm" onClick={() => onSpawn(ws)}>
                      + Terminale
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => startEdit(ws)}
                    >
                      Rinomina
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setConfirmingId(ws.id)}
                    >
                      Elimina
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
