// Segnale acustico di fine lavoro (Web Audio, zero dipendenze).
// File volutamente senza import da Tauri: importabile dai test `node --test`.

export interface DingNote {
  /** Frequenza in Hz. */
  freq: number;
  /** Offset di inizio in secondi rispetto all'inizio del ding. */
  at: number;
  /** Durata in secondi. */
  dur: number;
}

/** Due toni discendenti (880 -> 660 Hz), durata totale sotto 0,5 s. */
export const DING_SEQUENCE: DingNote[] = [
  { freq: 880, at: 0, dur: 0.14 },
  { freq: 660, at: 0.17, dur: 0.26 },
];

let ctx: AudioContext | null = null;

/**
 * Suona il ding di fine lavoro. Sicuro da chiamare ovunque: se l'audio
 * non e' disponibile (SSR, permessi) non fa nulla invece di lanciare.
 */
export function playDing(): void {
  try {
    if (typeof window === "undefined") return;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    for (const note of DING_SEQUENCE) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = note.freq;
      const t = t0 + note.at;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + note.dur + 0.05);
    }
  } catch {
    // Audio non disponibile: nessun ding, nessun errore.
  }
}
