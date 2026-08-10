# `@sfhs/control-feedback-mobile-controls-dom`

Presentation-only bridge from `@sfhs/mobile-controls` discrete DOM controls to SFHS Control Feedback presets.

Mobile Controls remains authoritative for contact ownership, layout, and `hold` / `pulse` / `toggle` outputs. The bridge mounts pointer-inert DOM feedback visuals inside existing Mobile Controls elements and never writes Mobile Controls state.

```ts
const feedback = attachMobileControlsFeedback({
  root,
  controller: mobileControls,
  bindings: [
    { controlId: "primary", preset: pressPreset },
    { controlId: "shield", preset: togglePreset }
  ]
});
```

Pulse and toggle output transitions drive an immediate presentation activation trace; toggle selection is then applied from the external Mobile Controls snapshot. Hold controls remain pressed while Mobile Controls owns their contact and rebound without proposing a product action.
