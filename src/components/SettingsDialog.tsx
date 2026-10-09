import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import MuseSettingsTab from "./MuseSettingsTab";
import { api } from "../lib/tauri";
import { DEFAULT_COMMAND_MAX, sanitizeDefaultCommand } from "../lib/settings";
import { cn } from "../lib/utils";

type Tab = "general" | "muse";

interface Props {
  isOpen: boolean;
  initialCommand: string;
  onClose: () => void;
  onSaved: (command: string) => void;
}

export default function SettingsDialog({
  isOpen,
  initialCommand,
  onClose,
  onSaved,
}: Props) {
  const [command, setCommand] = useState(initialCommand);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("general");

  useEffect(() => {
    if (isOpen) {
      setCommand(initialCommand);
      setError(null);
      setTab("general");
    }
  }, [isOpen, initialCommand]);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const s = await api.setDefaultCommand(sanitizeDefaultCommand(command));
      onSaved(s.default_command);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const preview = sanitizeDefaultCommand(command);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Impostazioni</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
          {(
            [
              { id: "general", label: "Generali" },
              { id: "muse", label: "Muse" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 rounded-md px-2 py-1 text-xs font-medium",
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "muse" ? (
          <MuseSettingsTab />
        ) : (
          <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold">
              Comando di default per i nuovi terminali
            </p>
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="es. npm run dev"
              maxLength={DEFAULT_COMMAND_MAX}
              className="font-mono"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Lascia vuoto per aprire i terminali senza eseguire nulla.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground">
              Anteprima
            </p>
            {preview === "" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Nessun comando: i nuovi terminali si apriranno vuoti.
              </p>
            ) : (
              <p className="mt-1 text-xs">
                A ogni nuovo terminale verrà eseguito automaticamente:{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  {preview}
                </code>
              </p>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {tab === "muse" ? (
            <Button variant="outline" onClick={onClose}>
              Chiudi
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button disabled={saving} onClick={() => void save()}>
                {saving ? "Salvataggio…" : "Salva"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
