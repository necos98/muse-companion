// Updater: tipi condivisi col backend Rust (src-tauri/src/updater.rs) + utility pure.
// File volutamente a zero dipendenze: importabile sia dall'app sia dai test
// `node --test` (type-stripping). I payload in ingresso mantengono lo snake_case
// di serde; la conversione camelCase di Tauri v2 vale solo per gli ARGOMENTI
// dei comandi, non per i valori restituiti.

export interface AssetInfo {
  name: string;
  size: number;
  url: string;
}

export interface UpdateConfig {
  owner: string;
  repo: string;
  configured: boolean;
  current_version: string;
  api_url: string;
  asset_patterns: string[];
  message: string;
}

export interface UpdateStatus {
  configured: boolean;
  owner: string;
  repo: string;
  current_version: string;
  latest_version: string;
  update_available: boolean;
  release_name: string;
  release_notes: string;
  release_url: string;
  published_at: string;
  asset: AssetInfo | null;
}

export interface DownloadResult {
  file_path: string;
  file_name: string;
  size_bytes: number;
  sha256: string;
  verified: boolean;
  release_version: string;
  release_url: string;
  message: string;
}

export interface InstallResult {
  launched: boolean;
  file_path: string;
  message: string;
}

/** Normalizza: trim, via il prefisso `v`/`V`, stringa vuota -> "0". */
export function normalizeVersion(raw: string): string {
  const t = raw.trim().replace(/^[vV]/, "");
  return t === "" ? "0" : t;
}

function splitPart(part: string): [number, string] {
  const m = /^(\d*)(.*)$/.exec(part) ?? ["", "", ""];
  const num = m[1] === "" ? 0 : Number.parseInt(m[1], 10);
  return [Number.isSafeInteger(num) ? num : 0, m[2]];
}

/**
 * Confronta due versioni (stessa spec di `compare_versions` in Rust):
 * prefisso `v` ignorato, componenti mancanti = 0, parti numeriche come numeri,
 * release (suffisso vuoto) > prerelease. Ritorna -1 | 0 | 1.
 */
export function compareVersions(local: string, remote: string): -1 | 0 | 1 {
  const pa = normalizeVersion(local).split(".");
  const pb = normalizeVersion(remote).split(".");
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const [nx, rx] = splitPart(pa[i] ?? "0");
    const [ny, ry] = splitPart(pb[i] ?? "0");
    if (nx !== ny) return nx < ny ? -1 : 1;
    if (rx === ry) continue;
    if (rx === "") return 1; // release > prerelease
    if (ry === "") return -1;
    return rx < ry ? -1 : 1;
  }
  return 0;
}

/** `true` se `remote` è più recente di `local`. */
export function isNewerVersion(local: string, remote: string): boolean {
  return compareVersions(local, remote) === -1;
}

/**
 * Sceglie l'installer: primo pattern (in ordine) che matcha un nome
 * (substring, case-insensitive). `null` se nessun pattern matcha.
 */
export function pickInstallerAsset(
  names: string[],
  patterns: string[],
): string | null {
  for (const pat of patterns) {
    const p = pat.toLowerCase();
    if (p === "") continue;
    const hit = names.find((n) => n.toLowerCase().includes(p));
    if (hit !== undefined) return hit;
  }
  return null;
}
