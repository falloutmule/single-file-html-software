# Chat One-Shot Execution Protocol v2

Use Protocol v2 only when the brief declares `protocol.version: 2` or the run explicitly selects it. Run fast preflight before authoring and deep preflight before artifact production. A missing default `node` command never proves that no compatible runtime exists.

Execution mode describes environment capability, not project verification. `SFHS_NATIVE_MODE` permits the real path; adapter integration, pack, exact verification, and browser proof remain separate gates. `CHAT_CANDIDATE_MODE` is permitted only with a current candidate runtime ZIP and writes only `candidate/index.unverified.html`. `SOURCE_ONLY_MODE` never claims an executable artifact.

Maintain `RUN-STATE.json` after each gate. Resume by validating it, checking referenced hashes, reopening required issues, and continuing at its next required action. Do not restart a valid interrupted run.

Use the gates in order: bounded product contract; preflight/mode; highest-risk interaction; complete loop; focused source tests; semantic scenario; project-defined visual/audio acceptance; strongest available artifact/browser evidence; physical-test seed; completion. A game requires a semantic complete-game loop; an editor, reader, dashboard, or utility requires a semantic primary workflow; exploratory software requires representative interaction and reset. Semantic drivers use actions rather than direct gameplay-state mutation and stay inert in normal play.

Record deep probes as `UNTESTED` until actually run and use `BLOCKED_BY_POLICY` only for an explicit policy boundary. Mode is an environment capability only: native mode does not certify adapter integration or a canonical artifact. `PRODUCT_COMPLETE` can be automated; `PRODUCT_USER_ACCEPTED` requires a retained human `REPORTED` or `VERIFIED` record bound to the tested artifact when known.

The brief defines the semantic scenario appropriate to the product and the required visual states. Completion evaluates evidence; it never repairs source, silently closes issues, performs optional hardening, creates a canonical artifact, or acts remotely. A completion becomes stale when a hashed source or required packet record changes.

Physical-test instructions must prominently name candidate versus canonical classification. Candidate testing can improve product evidence but cannot become canonical device acceptance.

Generate the Chat build kit with `sfhs one-shot kit --stage chat-build --output <kit>.json`. It produces a compact instruction JSON and a separately bound candidate-runtime ZIP. The runtime descriptor must say that its portable compiler is `AVAILABLE` before candidate mode is selected. The current generated runtime intentionally reports `UNAVAILABLE`: the real SFHS builder imports workspace `esbuild`, and Protocol v2 will not replace it with a hand-maintained second builder. This is `OSF-010`, a bounded follow-up rather than a hidden fallback.
