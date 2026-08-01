# Chat-to-Codex Graduation Protocol v1

Use graduation only after a bounded Chat build needs durable source ownership and
canonical SFHS execution. Initial creation remains the opt-in Chat Protocol v2.

1. Run `sfhs one-shot graduate inspect` on the supplied source, evidence, report,
   and candidate inputs. ZIP inspection is bounded and happens before extraction.
2. Accept a source authority only from a completion manifest, explicit lineage,
   matching source manifest, or documented deterministic inference. Ambiguity is a
   blocker; timestamps do not decide authority.
3. Run `graduate plan` before changing source. Preserve mechanics and evidence,
   rewire adapter/lifecycle/module ownership only when the plan identifies it, and
   retain candidate tooling as historical.
4. `graduate import` produces authoritative standalone source transactionally.
   `graduate materialize` makes an ignored disposable SFHS workspace copy. Neither
   command packages, verifies, commits, or performs remote actions.
5. Only the real SFHS packer, verifier, and browser runner may establish canonical
   evidence. A candidate or a user report remains respectively historical/candidate
   and REPORTED.

Graduation state is independent from product, SFHS, and evidence status. A project
may be canonical while still requiring a player-visible repair or physical testing.
