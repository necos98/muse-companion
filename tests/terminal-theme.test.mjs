import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TERMINAL_THEME } from "../src/lib/terminalTheme.ts";

// Palette Campbell (default di Windows Terminal): gli stessi ANSI che
// l'utente vede in PowerShell nativo.
// Fonte: https://learn.microsoft.com/en-us/windows/terminal/customize-settings/color-schemes
const CAMPBELL = {
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

describe("terminale: tema ANSI", () => {
  it("espone tutti i 16 colori ANSI con valori Campbell", () => {
    for (const [key, value] of Object.entries(CAMPBELL)) {
      assert.equal(TERMINAL_THEME[key], value, `colore ${key}`);
    }
  });

  it("non usa le chiavi purple di Windows Terminal (xterm le ignorerebbe)", () => {
    assert.ok(!("purple" in TERMINAL_THEME));
    assert.ok(!("brightPurple" in TERMINAL_THEME));
  });

  it("definisce base, cursore e selezione", () => {
    for (const key of [
      "background",
      "foreground",
      "cursor",
      "selectionBackground",
    ]) {
      assert.match(TERMINAL_THEME[key], /^#[0-9a-fA-F]{6}$/, key);
    }
  });
});
