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
import { api } from "../lib/tauri";
import { DEFAULT_COMMAND_MAX, sanitizeDefaultCommand } from "../lib/settings";

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

  useEffect(() => {
    if (isOpen) {
      setCommand(initialCommand);
      setError(null);
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? "Salvataggio…" : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
