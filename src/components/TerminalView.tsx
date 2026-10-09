import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { api, onPtyExit, onPtyOutput } from "../lib/tauri";
import type { Workspace } from "../lib/tauri";

interface Props {
  workspace: Workspace;
  active: boolean;
  onExit: () => void;
}

export default function TerminalView({ workspace, active, onExit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
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
      theme: {
        background: "#101216",
        foreground: "#e8e8e8",
        cursor: "#d0d0d0",
        selectionBackground: "#3a3d41",
      },
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

    term.onData((data) => {
      const s = sessionRef.current;
      if (s !== 0) void api.ptyWrite(s, data).catch(() => undefined);
    });

    const initialCols = term.cols;
    const initialRows = term.rows;

    void (async () => {
      try {
        unlistenOut = await onPtyOutput((e) => {
          if (e.session_id === sessionRef.current) term.write(e.data);
        });
        unlistenExit = await onPtyExit((e) => {
          if (e.session_id === sessionRef.current) onExitRef.current();
        });
        const id = await api.ptySpawn(workspace.id, initialCols, initialRows);
        if (disposed) {
          void api.ptyClose(id).catch(() => undefined);
          return;
        }
        sessionRef.current = id;
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
      ref={containerRef}
      className="terminal-pane absolute inset-0 py-2 pl-2"
      style={{ display: active ? "block" : "none" }}
    />
  );
}
