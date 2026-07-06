# SFHS Handoff Docs

## Active handoff contracts

- [Bitmap static asset handoff](bitmap-static-asset-handoff.md)

## Current rule

For the SNC building/prop handoff, the canonical assets are exact bitmap payloads, not SVG and not procedural redraws.

Target asset classes:

- houses
- offices
- strip malls
- cars
- trucks
- dumpsters

Hermes must preserve exact bitmap bytes and verify SHA-256 before integration.
