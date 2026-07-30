# SFHS Hermes task-packet contract

Task packets are generated per run from the JSON templates. Replace every
`${PLACEHOLDER}` with exact values before dispatch; unresolved placeholders are
invalid.

Required repository truth:

- absolute repository root;
- branch/base name and exact 40-character base commit;
- whether a clean worktree is required;
- exact allowed and forbidden paths.

Commands are ordered argument arrays, never shell strings. Materialization
records the exact Node executable and pnpm JavaScript entrypoint so a Hermes
shell with a restricted `PATH` still invokes the shared CLI. Each command
states whether it is read-only or may write only generated output. A builder stops on
an unexpected nonzero exit. The release-preparation command may return the
declared `SFHS_RELEASE_PHYSICAL_DEVICE_REQUIRED` blocker after it has written
valid local evidence; that does not authorize a release.

Evidence contains only paths, hashes, stable result codes, environment facts,
and run/session identifiers. Do not embed credentials, raw private prompts,
full logs, or unrelated repository data.

For a One-Shot game task, the bounded task packet must name the project-local
`one-shot/` packet files and their current statuses. A builder updates those
records while working; a checker reads them and treats a candidate artifact,
unverified physical claim, or declared-only adapter as noncanonical.

The checker receives the original contract and builder result paths. It must
recompute HEAD, status, artifact identity, and verifier output. It has an empty
write allowlist and returns exactly one bounded checker verdict. A checker
finding does not authorize repair.

Installation or clean-profile discovery must occur in a disposable profile or
under separate user authority. Repository validation and `hermes skills
inspect` do not authorize changes to a persistent Hermes profile.
