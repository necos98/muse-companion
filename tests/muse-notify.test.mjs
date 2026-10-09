import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DING_SEQUENCE, playDing } from "../src/lib/notifySound.ts";
import { museEnvState, museEnvStateText } from "../src/lib/muse.ts";

describe("notifySound: sequenza del ding", () => {
  it("due toni udibili, ordinati, durata totale sotto 1s", () => {
    assert.equal(DING_SEQUENCE.length, 2);
    for (const n of DING_SEQUENCE) {
      assert.ok(n.freq >= 100 && n.freq <= 4000, `freq fuori range: ${n.freq}`);
      assert.ok(n.dur > 0, "durata positiva");
      assert.ok(n.at >= 0, "offset non negativo");
    }
    assert.ok(DING_SEQUENCE[1].at >= DING_SEQUENCE[0].at, "note ordinate");
    const total = Math.max(...DING_SEQUENCE.map((n) => n.at + n.dur));
    assert.ok(total < 1, `ding troppo lungo: ${total}s`);
  });

  it("playDing senza window non lancia (no-op in node)", () => {
    assert.doesNotThrow(() => playDing());
  });
});

describe("muse: stato env", () => {
  it("mapping muse_found/installed -> stato", () => {
    assert.equal(
      museEnvState({ muse_found: false, installed: false }),
      "no-muse",
    );
    assert.equal(
      museEnvState({ muse_found: true, installed: false }),
      "not-installed",
    );
    assert.equal(museEnvState({ muse_found: true, installed: true }), "ready");
  });

  it("ogni stato ha un testo italiano", () => {
    for (const s of ["ready", "not-installed", "no-muse"]) {
      const t = museEnvStateText(s);
      assert.ok(typeof t === "string" && t.length > 0, s);
    }
    assert.equal(museEnvStateText("ready"), "Installato");
  });
});
