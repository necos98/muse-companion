// Stato terminale (titolo tab + semaforo busy/idle): utility pure.
// File volutamente a zero dipendenze: importabile sia dall'app sia dai test
// `node --test` (type-stripping), come src/lib/updater.ts.

/** Lunghezza massima del titolo mostrato nei tab. */
export const TERMINAL_TITLE_MAX = 40;

/**
 * Normalizza un titolo OSC ricevuto da xterm: trim, collassa gli spazi,
 * ignora le stringhe vuote (ritorna null), tronca a 40 caratteri.
 */
export function sanitizeTerminalTitle(raw: string): string | null {
  const collapsed = raw.trim().replace(/\s+/g, " ");
  if (collapsed === "") return null;
  return collapsed.slice(0, TERMINAL_TITLE_MAX);
}

export interface BusyTracker {
  /** Segnala output arrivato dal pty: diventa busy. */
  markOutput: () => void;
  /** Segnala Invio premuto nel terminale: diventa busy. */
  markEnter: () => void;
  /** Forza idle (es. uscita del pty), notificando solo su cambio. */
  markIdle: () => void;
  /** Ferma il timer interno. */
  dispose: () => void;
}

/**
 * Semaforo busy/idle con debounce: busy=true su output/enter, busy=false
 * dopo `idleMs` di silenzio. `onChange` è chiamata solo sul cambio di stato.
 */
export function createBusyTracker(opts: {
  idleMs: number;
  onChange: (busy: boolean) => void;
}): BusyTracker {
  const { idleMs, onChange } = opts;
  let busy = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const setBusy = (next: boolean) => {
    if (next === busy) return;
    busy = next;
    onChange(next);
  };

  const poke = () => {
    setBusy(true);
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      setBusy(false);
    }, idleMs);
  };

  const stopTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return {
    markOutput: poke,
    markEnter: poke,
    markIdle: () => {
      stopTimer();
      setBusy(false);
    },
    dispose: stopTimer,
  };
}
