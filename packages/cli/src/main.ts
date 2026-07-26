import { runCli } from "./index.ts";

const result = await runCli(process.argv.slice(2));
process.stdout.write(result.stdout);
if (result.stderr.length > 0) {
  process.stderr.write(result.stderr);
}

process.exitCode = result.exitCode;
