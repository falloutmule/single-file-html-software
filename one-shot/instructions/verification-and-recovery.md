# Verification and recovery

`dist/index.html` is canonical only when the real SFHS packer produced it and the current exact-artifact verifier passes. Put any useful unavailable-execution fallback at `candidate/index.unverified.html`; label it candidate, not canonical.

When execution is unavailable, retain authored source, the packet, exact command failures, environment facts, and bounded candidate evidence. Set `INTAKE_REQUIRED` or `BLOCKED` honestly. On interruption, inspect source, packet, issue log, and evidence first; resume from the recorded state rather than restarting or inventing success.
