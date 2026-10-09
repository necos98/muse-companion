import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

// L'UI usa shadcn/ui + Tailwind: lo stack gluestack/react-native-web è stato
// rimosso perché incompatibile con il dev server Vite (schermata bianca).
// Questo test impedisce di reintrodurlo per sbaglio.
describe("nessuna traccia dello stack gluestack/react-native", () => {
  it("package.json non dipende da gluestack, react-native-web o expo/html-elements", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(root, "package.json"), "utf8"),
    );
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    const banned = Object.keys(all).filter((n) =>
      /gluestack|react-native|expo\/html-elements/.test(n),
    );
    assert.deepEqual(banned, [], `dipendenze vietate: ${banned.join(", ")}`);
  });

  it("src/ e vite.config.ts non importano gluestack né react-native", () => {
    const offenders = [];
    for (const file of walk(path.join(root, "src"))) {
      if (!/\.(ts|tsx|js|jsx|css)$/.test(file)) continue;
      const src = readFileSync(file, "utf8");
      if (/gluestack|react-native(-web|-svg)?['"]/.test(src)) {
        offenders.push(path.relative(root, file));
      }
    }
    const viteConfig = readFileSync(
      path.join(root, "vite.config.ts"),
      "utf8",
    );
    if (/gluestack|react-native/.test(viteConfig)) offenders.push("vite.config.ts");
    assert.deepEqual(offenders, [], `file con import vietati: ${offenders.join(", ")}`);
  });
});
