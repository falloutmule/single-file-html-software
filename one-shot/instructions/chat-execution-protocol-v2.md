# Chat One-Shot Execution Protocol v2

Use Protocol v2 only when the brief declares `protocol.version: 2` or the run explicitly selects it. Run fast preflight before authoring and deep preflight before artifact production. A missing default `node` command never proves that no compatible runtime exists.

Execution mode describes environment capability, not project verification. `SFHS_NATIVE_MODE` permits the real path; adapter integration, pack, exact verification, and browser proof remain separate gates. `CHAT_CANDIDATE_MODE` is permitted only with a current candidate runtime ZIP and writes only `candidate/index.unverified.html`. `SOURCE_ONLY_MODE` never claims an executable artifact.

Maintain `RUN-STATE.json` after each gate. Resume by validating it, checking referenced hashes, reopening required issues, and continuing at its next required action. Do not restart a valid interrupted run.

The brief defines the semantic scenario appropriate to the product and the required visual states. Completion evaluates evidence; it never repairs source, silently closes issues, performs optional hardening, creates a canonical artifact, or acts remotely. A completion becomes stale when a hashed source or required packet record changes.

Physical-test instructions must prominently name candidate versus canonical classification. Candidate testing can improve product evidence but cannot become canonical device acceptance.
