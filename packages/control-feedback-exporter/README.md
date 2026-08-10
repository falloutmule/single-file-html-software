# @sfhs/control-feedback-exporter

Deterministic, renderer-neutral export helpers for SFHS control packs. It produces canonical preset/pack JSON, used-preset notices, adapter configuration examples, and injects a selected preset plus its provenance closure into a generated minimal demo shell.

The demo shell bundles only `@sfhs/control-feedback-dom`, the shared runtime/contract, and the selected preset—not the editor or preset inventory. Donor-derived demonstrations visibly retain their deterministic Third-Party Notices.
