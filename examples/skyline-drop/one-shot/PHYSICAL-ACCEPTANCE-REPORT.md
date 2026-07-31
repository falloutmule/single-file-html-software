---
{"schema":"sfhs.one-shot-physical-acceptance-report@1","status":"REPORTED","facts":{"result":"REPORTED PASS","artifact":{"classification":"canonical","path":"dist/index.html","bytes":2091772,"sha256":"d7e95638ad9d31e924fbf9ba9d8f4d95070d06a57b4ade461a2c42ab1f726721","buildId":"skyline-drop-cfb081a04f41"},"graduationStatus":"GRADUATION_COMPLETE","formalMetadataStatus":"INCOMPLETE"}}
---

# Physical Acceptance Report

## Reported result

The user reported `REPORTED PASS` for the exact canonical Skyline Drop artifact:

- Build ID: `skyline-drop-cfb081a04f41`
- Path: `dist/index.html`
- Bytes: `2,091,772`
- SHA-256: `d7e95638ad9d31e924fbf9ba9d8f4d95070d06a57b4ade461a2c42ab1f726721`

This establishes reported physical product acceptance for that artifact and sets the project graduation status to `GRADUATION_COMPLETE`. It does not upgrade the physical result to `VERIFIED`.

## Formal metadata not supplied

The report did not include the following fields. They are deliberately recorded as absent rather than inferred from the target test seed:

- test date and duration;
- exact device model;
- Android version;
- numeric Chrome version;
- portrait and landscape viewport width, height, and DPR;
- required screenshots or rotate-gate capture;
- field-level checklist notes, including audio, lifecycle, performance, heat, and spatial-readability observations.

This evidence-detail gap is tracked as deferred issue `I-005`. A future repeat session should use `PHYSICAL-TEST-SEED.json` and `PHYSICAL-TEST-INSTRUCTIONS.md`; it must bind any result to its exact tested artifact rather than retroactively altering this report.
