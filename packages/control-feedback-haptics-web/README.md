# `@sfhs/control-feedback-haptics-web`

Optional best-effort browser vibration transport for SFHS symbolic cues. Unsupported devices, rejected vibration calls, disabled state, and exceptions degrade silently. Haptics never mutate control state, confirm an action, or block activation.

Built-in bounded patterns cover subtle tick, firm press, toggle, success, and error. No renderer dependency or external request is introduced.
