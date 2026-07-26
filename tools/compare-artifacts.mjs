import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

if (process.argv.length !== 4) {
  throw new Error("Usage: node tools/compare-artifacts.mjs <first.html> <second.html>");
}

const firstPath = resolve(process.argv[2]);
const secondPath = resolve(process.argv[3]);
const [first, second] = await Promise.all([readFile(firstPath), readFile(secondPath)]);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const result = {
  schema: "sfhs.cross-platform-determinism@1",
  first: { bytes: first.byteLength, sha256: sha256(first) },
  second: { bytes: second.byteLength, sha256: sha256(second) },
  identical: first.equals(second)
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.identical) {
  process.exitCode = 1;
}
