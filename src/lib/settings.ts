// Impostazioni globali: comando di default eseguito a ogni nuovo terminale.
// File volutamente a zero dipendenze: importabile sia dall'app sia dai test
// `node --test` (type-stripping), come src/lib/terminal.ts.

/** Lunghezza massima del comando di default. */
export const DEFAULT_COMMAND_MAX = 1000;

/** Attesa dopo il primo output del pty prima di inviare il comando. */
export const DEFAULT_COMMAND_AFTER_OUTPUT_MS = 150;

/**
 * Fallback: se la shell non ha ancora stampato nulla (avvio freddo WSL),
 * invia comunque il comando dopo questo tempo dallo spawn.
 */
export const DEFAULT_COMMAND_FALLBACK_MS = 2500;

/**
 * Normalizza il comando: trim, stringa vuota se blank, troncato a 1000
 * caratteri. Lo spacing interno è preservato (fa parte del comando).
 */
export function sanitizeDefaultCommand(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length <= DEFAULT_COMMAND_MAX) return trimmed;
  return trimmed.slice(0, DEFAULT_COMMAND_MAX);
}

/** True solo se c'è un comando da eseguire (non vuoto/blank). */
export function shouldInjectDefaultCommand(cmd: string): boolean {
  return cmd.trim() !== "";
}

/**
 * Costruisce l'input da scrivere nel pty: comando + ritorno carrello
 * (Invio). Funziona su PowerShell/cmd e sulle shell WSL perché simula
 * la digitazione dell'utente.
 */
export function buildDefaultCommandInput(cmd: string): string {
  return `${cmd}\r`;
}
