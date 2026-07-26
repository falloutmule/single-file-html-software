import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createContractEvidence } from "../src/index.ts";

const output = resolve("docs/evidence/sfhs-012b0/compatibility-contract.json");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(createContractEvidence(), null, 2)}\n`, "utf8");
