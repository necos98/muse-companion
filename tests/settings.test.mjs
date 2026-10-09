import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_COMMAND_MAX,
  buildDefaultCommandInput,
  sanitizeDefaultCommand,
  shouldInjectDefaultCommand,
} from "../src/lib/settings.ts";

describe("settings: comando di default", () => {
  it("trim + limite 1000 caratteri", () => {
    assert.equal(DEFAULT_COMMAND_MAX, 1000);
    assert.equal(sanitizeDefaultCommand("  npm run dev  "), "npm run dev");
    assert.equal(sanitizeDefaultCommand(""), "");
    assert.equal(sanitizeDefaultCommand("x".repeat(1500)), "x".repeat(1000));
  });

  it("vuoto o blank => nessuna iniezione", () => {
    assert.equal(shouldInjectDefaultCommand(""), false);
    assert.equal(shouldInjectDefaultCommand("   \t  "), false);
    assert.equal(shouldInjectDefaultCommand("ls"), true);
  });

  it("l'input inviato al pty termina con ritorno carrello", () => {
    assert.equal(buildDefaultCommandInput("ls"), "ls\r");
  });
});
