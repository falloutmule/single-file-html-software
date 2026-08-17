# Physical Android Test Seed

Classification: exact-verified, Chromium-accepted, and deployed. The user waived the unavailable physical-link session for this deployment; this seed is retained for any later optional device pass.

- Artifact: `examples/the-imaginarium/dist/index.html`
- Build ID: `the-imaginarium-abb5ce5e503d`
- Bytes: 639,570
- SHA-256: `53ba88e5f3e54c728efa220bca6dbf3f910a62377a8c8f376e8a2f81c6ab8c6b`
- Logical picture export: 1080×1440 PNG
- Required physical model: `SM-G998*`

Record device model, Android version, four-part Chrome version, viewport, DPR, orientation, delivery method, date, Build ID, bytes, and SHA-256. Test the exact artifact in portrait first and landscape where required:

1. startup and home layout;
2. Big Toy Button contact, hold, slide-off cancellation, release-inside activation, long press, and repeated taps;
3. Tool Button rapid taps and one action per activation;
4. Toy Choice selected depth, current-choice press, and category swipe/tap behavior;
5. sticker placement and dragging, followed by Bigger, Smaller, Turn, Copy, Trash, Undo, and Redo;
6. sound after a trusted touch, sound-off behavior, haptics on/off where supported, and visual fallback;
7. reduced-motion contact, release, and selected seating;
8. save, gallery, reopen, background dialog, confirmation dialog, and Grown-Up Tools;
9. interruption behavior for pointer cancellation, app focus loss, and multi-touch where practical;
10. final console/runtime-request observations and screenshots bound to the exact SHA-256.
11. each auto-save timing choice, especially quiet background saving and the absence of repeated success sounds while editing.
12. Make a Puzzle from a real local photo and from a saved creation; crop/zoom/recenter; Easy, Fun, and Tricky; near snap, far wrong drop, slide-off/pointer cancellation, hint, shuffle, completion, resume after browser restart, and portrait-to-landscape rotation.
13. confirm the enlarged board and non-interactive answer cells; place a piece over its correct cell and verify release does not lock it; press reusable Snap and verify all correctly centered pieces lock while wrong-cell pieces remain loose; repeat empty and successful presses; verify reload persistence and keyboard activation.
14. press Race and verify the timer starts at zero, advances visibly, survives leaving and resuming the puzzle, freezes on the final Snap, cannot restart during that attempt, and resets with Play Again or Shuffle.

Current device observation on 2026-08-11: `adb devices -l` listed only `emulator-5554`; `adb mdns services` found no physical service; Windows PnP exposed no Samsung/Android handset. The user then waived this link-based test. No physical verdict is claimed.
