import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { api } from "../lib/tauri";
import type { MuseEnvStatus } from "../lib/tauri";
import { museEnvState, museEnvStateText } from "../lib/muse";
import { cn } from "../lib/utils";

/** Tab "Muse": installa il plugin di fine lavoro negli env (Windows + WSL). */
export default function MuseSettingsTab() {
  const [envs, setEnvs] = useState<MuseEnvStatus[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [log, setLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setEnvs(await api.museEnvStatus());
      setLoadError(null);
    } catch (e) {
      setLoadError(String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (key: string, action: "install" | "remove") => {
    setBusyKey(key);
    setError(null);
    setLog(null);
    try {
      const out =
        action === "install"
          ? await api.installMusePlugin(key)
          : await api.removeMusePlugin(key);
      setLog(out);
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyKey(null);
    }
  };

  const test = async () => {
    setTesting(true);
    setError(null);
    setLog(null);
    try {
      setLog(await api.testMuseNotify());
    } catch (e) {
      setError(String(e));
    } finally {
      setTesting(false);
    }
  };

  if (loadError) return <p className="text-xs text-destructive">{loadError}</p>;
  if (!envs)
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Rilevamento ambienti…
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground">
        Installa il plugin Muse in un ambiente per sentire un ding quando una
        sessione finisce. Su WSL il plugin va installato in ogni distro usata.
      </p>

      {envs.map((env) => {
        const state = museEnvState(env);
        const busy = busyKey === env.key;
        return (
          <div
            key={env.key}
            className="flex items-center gap-2 rounded-lg border bg-card p-2.5"
          >
            <Badge variant="secondary" className="font-mono">
              {env.kind === "windows" ? "WIN" : env.label}
            </Badge>
            <span
              className={cn(
                "h-2 w-2 flex-shrink-0 rounded-full",
                state === "ready"
                  ? "bg-green-500"
                  : state === "not-installed"
                    ? "bg-yellow-500"
                    : "bg-muted-foreground/40",
              )}
            />
            <span className="min-w-0 flex-1 truncate text-xs">
              {env.kind === "windows" ? "Windows" : env.label}
              <span className="text-muted-foreground">
                {" "}
                · {museEnvStateText(state)}
              </span>
            </span>
            {state !== "no-muse" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(env.key, "install")}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : state === "ready" ? (
                    "Reinstalla"
                  ) : (
                    "Installa"
                  )}
                </Button>
                {state === "ready" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void run(env.key, "remove")}
                  >
                    Rimuovi
                  </Button>
                )}
              </>
            )}
          </div>
        );
      })}

      <div>
        <Button
          size="sm"
          variant="outline"
          disabled={testing}
          onClick={() => void test()}
        >
          {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Prova ding
        </Button>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Invia un segnale di prova attraverso lo stesso canale degli hook.
        </p>
      </div>

      {log && (
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/50 p-2.5 font-mono text-[11px]">
          {log}
        </pre>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
