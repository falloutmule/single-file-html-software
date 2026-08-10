# SFHS Control Editor Guide

## What this editor does

The SFHS Control Editor lets you design a button or control and save it as portable data. The same design can be used in a regular web page through the DOM adapter or in a PixiJS v8 project.

The editor is one self-contained HTML file. It does not need an internet connection after you download it.

## Quick start

1. Open the packed `examples/control-feedback-editor/dist/index.html` file in Chrome or another Chromium-based browser. A delivered copy may be renamed `SFHS-Control-Editor.html`.
2. Use the controls on the left to change the design.
3. Press the large control in the live preview to feel and see its response.
4. Use the state buttons and torture tests to check unusual situations.
5. Save the design as JSON or export a playable demonstration.

Your changes stay in the current browser page until you save them. Save a pack before closing the page if you want to continue later.

## Important terms

- **Preset:** One complete control design.
- **Pack:** A file containing one or more presets.
- **DOM:** The normal button and input system used by web pages.
- **PixiJS:** A graphics renderer commonly used by browser games.
- **Haptics:** Short vibration feedback on supported phones.
- **Reduced motion:** A calmer version of the design for people who prefer less animation.

## The editor screen

The left side contains four tabs:

- **Appearance** controls shape, size, color, border, text, shadows, and state colors.
- **Motion** controls press travel, scale, rebound, easing, ripple, shine, and glow.
- **Cues** controls sound, volume, pitch variation, voice limits, mute, and haptics.
- **Export** shows portable JSON and adapter configuration.

The right side contains:

- the live control;
- state preview buttons;
- the torture-test panel;
- an activation counter.

On a phone, the editor stacks these areas vertically.

## Design a control

### 1. Choose a starting point

Open the **Template** menu. You can start with the original editor control or one of the 25 included designs.

Templates from Uiverse, Animata, and Magic UI keep their required source and license information. If you rename or change one of these controls, its attribution stays attached.

### 2. Choose the behavior

Use **Semantic** to choose what the control means:

- **Momentary** performs one action when released successfully.
- **Toggle / switch** proposes an on-or-off change.
- **Choice / radio** proposes one selection from a group.

The application remains in charge of permanent state. The feedback system shows the interaction and reports the proposed action.

### 3. Set the appearance

Start with width, height, shape, radius, and fill. Then adjust the border, shadow depth, text, and icon.

State colors control special situations:

- **Selected** shows that a toggle or choice is active.
- **Disabled** shows that the control cannot be used.
- **Loading** shows that work is in progress.
- **Success** shows a successful result.
- **Error** shows that something failed.

Keep the label short and clear. A user should understand the control without guessing.

### 4. Set the motion

- **Press travel** moves the control while it is held.
- **Press scale** makes it slightly smaller during a press.
- **Squash Y** changes its vertical shape.
- **Rebound** controls how long it takes to return.
- **Overshoot** lets it move slightly past its resting point before settling.
- **Ripple** creates a brief wave at the contact point.
- **Ripple cap** limits how many ripple effects may exist at once.

Short movement usually feels more responsive. Large movement and long rebound times can make rapid tapping feel slow.

### 5. Set sound and haptics

Choose a sound family, then use **Preview sound** to hear it. Adjust volume, pitch variation, and the maximum number of simultaneous sounds.

Use **Mute** to confirm that the control still works without sound.

Enable **Haptics** only when vibration adds useful feedback. Haptics are optional and may not work in every browser or device. They never decide whether an action succeeded.

## Preview every state

Use the state buttons below the live control:

- Idle
- Hover
- Pressed
- Focused
- Selected
- Disabled
- Loading
- Success
- Error

These buttons change the preview only. They do not replace the application's real state.

## Run the torture tests

Press **Run all** to run all 12 checks. Each result should say `PASS`.

| Test | What it checks |
| --- | --- |
| Rapid taps | Repeated presses stay responsive. |
| Release outside | Dragging away and releasing does not activate. |
| Drag away / re-enter | Returning before release can activate once. |
| Pointer cancel | A canceled touch does not leave the control pressed. |
| Two fingers | A second touch cannot steal the first touch. |
| Keyboard | A Space-key activation follows the same action rules. |
| Repeated toggle | Toggle proposals remain exact and responsive. |
| Disable pressed | Disabling during a press releases the control safely. |
| Focus loss | Losing focus cannot leave a stuck press. |
| Mute | Muting sound does not block the action. |
| Reduced motion | Effects are removed without changing the action. |
| Slow frame | The control recovers after a delayed frame. |

## Save and load

### Save a pack

Press **Save pack** to download a deterministic JSON file. Deterministic means the same design produces the same file contents every time.

A pack can contain more than one preset. When you load a multi-preset pack, use **Pack member** to move between its controls.

### Load JSON

Press **Load JSON** and choose a saved preset or pack. The editor validates the file before using it. Invalid or unsupported data is rejected instead of being guessed or silently changed.

## Export choices

Open the **Export** tab and choose an output:

- **Preset JSON** contains the current control.
- **Pack JSON** contains the current pack.
- **DOM config** describes how to use it with the native DOM adapter.
- **Pixi v8 config** describes how to use it with the PixiJS v8 adapter.
- **Third-party notices** contains only the notices required by the controls in the current pack.

Press **Copy output** to copy the visible output.

Press **Export demo** at the top of the editor to download a playable single-file HTML demonstration. The demonstration includes the real shared runtime and DOM adapter. It works offline and does not contact donor websites.

## Mobile use and long presses

The live control is designed to own touch interaction while it is being pressed. It prevents the browser's text-selection callout on that control surface, so holding the control should not select its label or open a context menu.

Normal text fields and the export text area remain selectable. This lets you edit labels and copy configuration normally.

If a phone still gives a brief vibration, check whether **Haptics** is enabled. That vibration may be the selected press cue rather than a browser selection gesture. Device and browser vibration support varies.

## Accessibility checklist

Before using a control in a product:

1. Give it a clear accessible label.
2. Check the focused state with a keyboard.
3. Confirm that disabled controls cannot activate.
4. Check selected, loading, success, and error states.
5. Run the reduced-motion preview.
6. Test without sound and without haptics.
7. Keep the touch target large enough for comfortable use.

The DOM adapter uses real buttons, checkboxes, switches, and radio inputs. A PixiJS product should also provide an accessible DOM or keyboard surface when the canvas alone is not enough.

## Recommended workflow

1. Start from a template close to your goal.
2. Set the semantic behavior first.
3. Adjust appearance.
4. Add motion with short, responsive timing.
5. Add optional sound and haptics.
6. Preview all states.
7. Run all torture tests.
8. Save a pack.
9. Export a demo and test it offline.
10. Keep the JSON pack with your project's source files.

## Troubleshooting

### Sound does not play

Press **Preview sound** or the live control once. Browsers usually require a real user gesture before they allow audio. Also check **Mute** and the volume setting.

### Haptics do not work

Haptics require browser and device support. Unsupported devices correctly do nothing. The control should still activate normally.

### The control stays pressed

Run the pointer-cancel and focus-loss torture tests. Reload the editor if the page was suspended by the browser. A valid current build should release ownership in both tests.

### A loaded file is rejected

The editor uses strict validation. Check that the file is an SFHS control preset or pack and that its schema is `sfhs.control-preset@0` or `sfhs.control-pack@0`.

### The exported demo does not open

Save it with an `.html` extension, then open it directly in a Chromium-based browser. The file is self-contained and should not require a server or internet connection.
