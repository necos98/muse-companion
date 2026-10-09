// Stato installazione plugin Muse per env: pure functions zero-dep.
// Il tipo rispecchia MuseEnvStatus del bridge (src/lib/tauri.ts).

export interface MuseEnvLike {
  muse_found: boolean;
  installed: boolean;
}

export type MuseEnvState = "ready" | "not-installed" | "no-muse";

export function museEnvState(env: MuseEnvLike): MuseEnvState {
  if (!env.muse_found) return "no-muse";
  if (!env.installed) return "not-installed";
  return "ready";
}

export function museEnvStateText(state: MuseEnvState): string {
  switch (state) {
    case "ready":
      return "Installato";
    case "not-installed":
      return "Non installato";
    case "no-muse":
      return "muse non trovato";
  }
}
