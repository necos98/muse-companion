import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { api, onPtyExit, onPtyOutput } from "../lib/tauri";
import type { Workspace } from "../lib/tauri";
import { createBusyTracker, sanitizeTerminalTitle } from "../lib/terminal";
import { TERMINAL_THEME } from "../lib/terminalTheme";

interface Props {
  workspace: Workspace;
  active: boolean;
  onExit: () => void;
  onTitle?: (title: string) => void;
  onStatus?: (busy: boolean) => void;
}

export default function TerminalView({
  workspace,
  active,
  onExit,
  onTitle,
  onStatus,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const onTitleRef = useRef(onTitle);
  onTitleRef.current = onTitle;
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;
  const activeRef = useRef(active);
  activeRef.current = active;
  const sessionRef = useRef(0);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const term = new Terminal({
      fontSize: 13,
      fontFamily: 'Consolas, "Cascadia Code", monospace',
      theme: TERMINAL_THEME,
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    let disposed = false;
    let unlistenOut: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;

    const status = createBusyTracker({
      idleMs: 2000,
      onChange: (busy) => onStatusRef.current?.(busy),
    });

    const titleDisp = term.onTitleChange((t) => {
      const next = sanitizeTerminalTitle(t);
      if (next !== null) onTitleRef.current?.(next);
    });

    term.onData((data) => {
      const s = sessionRef.current;
      if (s !== 0) void api.ptyWrite(s, data).catch(() => undefined);
      if (data.includes("\r") || data.includes("\n")) status.markEnter();
    });

    const initialCols = term.cols;
    const initialRows = term.rows;

    // Le metriche della cella dipendono dal font: se il font si assesta dopo
    // il primo fit(), righe/colonne risultano stale. Questo refit riallinea
    // xterm e PTY; se scatta prima dello spawn viene saltato e ci pensa il
    // refit post-spawn qui sotto (i due coprono entrambi gli ordini).
    document.fonts.ready
      .then(() => {
        if (disposed) return;
        if (!activeRef.current || sessionRef.current === 0) return;
        try {
          fit.fit();
          void api
            .ptyResize(sessionRef.current, term.cols, term.rows)
            .catch(() => undefined);
        } catch {
          // ignora: succede durante lo smontaggio
        }
      })
      .catch(() => undefined);

    void (async () => {
      try {
        unlistenOut = await onPtyOutput((e) => {
          if (e.session_id === sessionRef.current) {
            term.write(e.data);
            status.markOutput();
          }
        });
        unlistenExit = await onPtyExit((e) => {
          if (e.session_id === sessionRef.current) {
            status.markIdle();
            onExitRef.current();
          }
        });
        const id = await api.ptySpawn(workspace.id, initialCols, initialRows);
        if (disposed) {
          void api.ptyClose(id).catch(() => undefined);
          return;
        }
        sessionRef.current = id;
        // Recupera eventuali resize avvenuti prima dello spawn (il
        // ResizeObserver li ignora finché la sessione è 0): riadatta xterm
        // al contenitore reale e risincronizza il PTY.
        if (activeRef.current) {
          try {
            fit.fit();
            void api
              .ptyResize(id, term.cols, term.rows)
              .catch(() => undefined);
          } catch {
            // ignora: succede durante lo smontaggio
          }
        }
      } catch (err) {
        term.writeln(`\x1b[1;31m${String(err)}\x1b[0m`);
      }
    })();

    const ro = new ResizeObserver(() => {
      if (!activeRef.current || sessionRef.current === 0) return;
      try {
        fit.fit();
        void api
          .ptyResize(sessionRef.current, term.cols, term.rows)
          .catch(() => undefined);
      } catch {
        // ignora: succede durante lo smontaggio
      }
    });
    ro.observe(el);

    return () => {
      disposed = true;
      ro.disconnect();
      unlistenOut?.();
      unlistenExit?.();
      titleDisp.dispose();
      status.dispose();
      const s = sessionRef.current;
      sessionRef.current = 0;
      if (s !== 0) void api.ptyClose(s).catch(() => undefined);
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  // Quando il tab torna visibile, riadatta il terminale alla dimensione reale.
  useEffect(() => {
    if (!active) return;
    const term = termRef.current;
    const fit = fitRef.current;
    const s = sessionRef.current;
    if (!term || !fit || s === 0) return;
    requestAnimationFrame(() => {
      try {
        fit.fit();
        void api.ptyResize(s, term.cols, term.rows).catch(() => undefined);
      } catch {
        // ignora
      }
    });
  }, [active]);

  return (
    <div
      className="terminal-pane absolute inset-0 py-2 pl-2"
      style={{ display: active ? "block" : "none" }}
    >
      {/* L'host di xterm non deve avere padding: FitAddon misura il
          contenitore e una riga/colonna in più finirebbe fuori vista. */}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
