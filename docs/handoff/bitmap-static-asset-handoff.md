# Bitmap Static Asset Handoff

## Goal

Define the SFHS handoff format for exact bitmap assets moving from an outside chatbot into Hermes and then into the SNC game without reinterpretation.

Plain summary: the handoff is a sealed bitmap asset capsule. It carries the same authored image data that was approved in chat, verifies it by hash, and tells Hermes not to redraw, regenerate, convert, or substitute it.

## Correct scope

The first SNC handoff target is an authored bitmap pack for environmental buildings and props:

- random houses
- offices
- strip malls
- cars
- trucks
- dumpsters

These are the target objects. They are not service-station icons, pantry tables, aid tables, charging stations, or other operational modules.

## Hard rule: bitmap, not SVG

The authoritative asset format is bitmap.

Allowed payloads:

- `image/png` data URI generated from the final approved bitmap
- raw RGBA pixel payload encoded as base64 when exact pixel inspection is required
- optional tiny JSON metadata for placement, footprint, tags, and provenance

Not allowed for this handoff:

- inline SVG as the canonical asset
- procedural redraw instructions as the canonical asset
- prompt-only descriptions as the canonical asset
- AI-restyled replacements
- category substitution
- converting the bitmap into a different art format without explicit user approval

## Exactness rule

Every asset must carry exact source bytes and a SHA-256 hash.

Hermes must verify the hash before using the asset. If the hash fails, Hermes blocks integration and reports the mismatch.

```js
const ASSET_EXACTNESS_RULE = Object.freeze({
  canonicalFormat: 'bitmap',
  preferredMime: 'image/png',
  requiredHash: 'sha256',
  rejectCanonicalSvg: true,
  rejectProceduralReplacement: true,
  rejectPromptOnlyAsset: true,
  rejectCategorySubstitution: true
});
```

## Required manifest shape

```js
const SFHS_BITMAP_HANDOFF = Object.freeze({
  format: 'SFHS-BITMAP-STATIC-ASSET-HANDOFF',
  version: '0.1.0',
  targetProject: 'falloutmule/solidarity-not-charity-can-run',
  targetRuntime: 'single-file-html',
  assetClasses: ['house', 'office', 'strip_mall', 'car', 'truck', 'dumpster'],
  readPolicy: {
    first: ['HUMAN_SUMMARY', 'ASSET_INDEX', 'CHANGE_LEDGER', 'HASH_STATUS'],
    decodeOnlyWhen: ['asset_requested', 'hash_changed', 'integration_test_failed']
  },
  assets: [
    {
      id: 'strip_mall_001',
      class: 'strip_mall',
      label: 'Strip Mall 001',
      canonicalFormat: 'bitmap',
      mime: 'image/png',
      encoding: 'data-uri',
      sha256: 'TO_BE_FILLED_BY_BUILD_OR_AUTHORING_TOOL',
      dataUri: 'data:image/png;base64,TO_BE_FILLED',
      footprint: { wCells: 0, hCells: 0 },
      anchor: { x: 0, y: 0 },
      provenance: {
        authoredIn: 'ChatGPT',
        approvalState: 'pending',
        note: 'Do not regenerate; integrate exact bitmap bytes.'
      }
    }
  ]
});
```

## Viewer requirement

The handoff viewer displays bitmap assets on a canvas grid. Android Chrome interactions happen inside the viewer:

- one finger drag pans the canvas view
- two finger pinch zooms the canvas view
- two finger twist rotates the canvas view
- double tap resets the view
- debug overlay shows DPR, CSS canvas size, backing canvas size, zoom, rotation, asset count, and hash status

The viewer must not treat browser page zoom as the required interaction model.

## Hermes integration rule

When Hermes imports an asset into SNC:

1. read the asset index first
2. verify the hash before decoding or integrating
3. preserve the bitmap bytes exactly
4. preserve the asset ID exactly
5. preserve footprint and anchor metadata unless explicitly changed
6. do not convert the bitmap to SVG
7. do not replace the asset with procedural drawing
8. do not substitute operational-service categories for environmental building/prop classes

## First test pack

The first acceptable smoke pack is:

```text
house_001
office_001
strip_mall_001
car_001
truck_001
dumpster_001
```

Each item may be a small placeholder bitmap only after it is intentionally authored as a bitmap. Placeholders must still be carried as exact bitmap payloads with hashes.

## Test contract

A valid build candidate must prove:

- the handoff manifest exists
- every asset is canonical bitmap
- no asset is canonical SVG
- every asset has a SHA-256 hash
- every asset hash verifies
- asset classes are limited to house, office, strip_mall, car, truck, dumpster unless explicitly expanded
- the viewer renders the decoded bitmap assets
- zoom and rotation work through the canvas viewer state
- no external runtime requests are made

## Current status

Planning and contract only. No bitmap assets have been authored or integrated by this document.

## Next actionable step

Author the first exact bitmap asset, preferably `strip_mall_001`, then add it to a handoff capsule with a computed SHA-256 and screenshot proof.
