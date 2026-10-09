// Tema del terminale xterm (palette ANSI Campbell di Windows Terminal).
// File volutamente a zero dipendenze: importabile sia dall'app sia dai test
// `node --test` (type-stripping), come src/lib/terminal.ts e src/lib/updater.ts.
//
// Nota: Windows Terminal chiama i viola `purple`/`brightPurple`, ma xterm.js
// vuole le chiavi `magenta`/`brightMagenta` (quelle ignote vengono ignorate
// in silenzio, lasciando i default).

/**
 * Sottoinsieme di `ITheme` di xterm.js usato dall'app.
 * Tipizzato qui per non dipendere da xterm nei test.
 */
export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

/**
 * Base scura dell'app + 16 ANSI Campbell (default di Windows Terminal, vedi
 * https://learn.microsoft.com/en-us/windows/terminal/customize-settings/color-schemes):
 * gli stessi colori che l'utente vede in PowerShell nativo.
 */
export const TERMINAL_THEME: TerminalTheme = {
  background: "#101216",
  foreground: "#e8e8e8",
  cursor: "#d0d0d0",
  selectionBackground: "#3a3d41",
  black: "#0C0C0C",
  red: "#C50F1F",
  green: "#13A10E",
  yellow: "#C19C00",
  blue: "#0037DA",
  magenta: "#881798",
  cyan: "#3A96DD",
  white: "#CCCCCC",
  brightBlack: "#767676",
  brightRed: "#E74856",
  brightGreen: "#16C60C",
  brightYellow: "#F9F1A5",
  brightBlue: "#3B78FF",
  brightMagenta: "#B4009E",
  brightCyan: "#61D6D6",
  brightWhite: "#F2F2F2",
};
