# SFHS One-Shot Factory

The One-Shot Factory is the agent-facing foreman for SFHS. SFHS core builds and verifies software; One-Shot tells an agent how to turn a bounded concept into an auditable SFHS project without recreating SFHS.

Use [START-HERE.md](START-HERE.md) as the public entry point. The current implementation supports initializing the real Pixi v8 template; other lanes are routed to discussion, intake, or an honest blocker until current repository support exists.

Project packets are Markdown with a small JSON front-matter record. This permits lightweight CLI audits without forcing prose into a schema.

Graduation Protocol v1 is the separate path for a completed Chat package or
legacy source/evidence collection. It performs secure intake, source-lineage
resolution, migration planning, transactional standalone import, and ignored
workspace materialization. It never substitutes for SFHS pack/verify/browser
authorities and never creates remote repositories or releases.
