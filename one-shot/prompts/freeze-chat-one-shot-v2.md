# Freeze a Chat One-Shot

Validate `one-shot/RUN-STATE.json`, packet identities, required gates, and open issue categories. Do not repair source or run optional hardening. Move non-required work into `deferredHardening`, `graduationBacklog`, or `releaseBacklog`; only required-before-completion items block. Generate the completion record and the physical-test seed/instructions for the exact candidate or canonical artifact. If any hashed source or required record changes afterward, mark completion stale and reopen the required gate.
