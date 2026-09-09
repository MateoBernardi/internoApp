---
name: input-focus-style
description: Fix or apply this app's custom TextInput focus styling — replacing the mismatched browser default focus ring (React Native Web) with a border on the input's own container that matches app colors. Use when a focused input shows a wrong-colored or wrong-sized outline, when asked to "remove the focus border" or "match the focus color to styling," or when adding a new TextInput-based component that should look consistent with existing glass-style inputs.
---

# Custom input focus styling (React Native Web)

## The problem

React Native Web renders `<TextInput>` as a real HTML `<input>`. Browsers draw
their own default focus ring on that `<input>` — not on the wrapping `View`
that forms the visible "box" (icon + input + toggle button, glass background,
rounded corners). The result is a ring that:

- is shorter/narrower than the actual input box (it only wraps the bare
  `<input>`, ignoring the padding/icon/toggle around it), and
- is browser-default blue, unrelated to the app's palette.

Native (iOS/Android) doesn't have this problem — there's no browser outline —
so this only shows up on web, which is easy to miss if you only test on
device.

## The fix

Don't try to restyle the native outline (browsers make this unreliable
cross-browser). Instead: suppress it entirely and draw the app's own focus
state on the outer container.

1. Track focus locally in the input component with `onFocus`/`onBlur` →
   `useState`.
2. Apply a focused style to the **outer container** (the `View` with the
   rounded border/background), not the inner `TextInput` — that's what makes
   the ring match the box's actual length/shape.
3. Suppress the browser's native ring on the `TextInput` itself with
   `outlineStyle: 'none'` and `outlineWidth: 0`. These are web-only CSS
   properties not in React Native's `TextStyle` type, so the style object
   needs an `as any` cast — this is expected, not a type error to "fix"
   another way. They're no-ops on native, so this is always safe to include.
4. Pick the focused border color from the app's existing color tokens (here,
   `glassColors.link` from `shared/ui/glass.ts`) rather than inventing a new
   blue — it should read as "this app's accent," not "browser default."

Reference implementation: `components/InputWithIcon.tsx` — see the
`isFocused` state, `inputContainerFocused` style (applied to the outer
`View`), and the `inputNoOutline` style (applied to the `TextInput`, cast
`as any`).

```tsx
const [isFocused, setIsFocused] = useState(false);

<View style={[styles.inputContainer, isFocused && styles.inputContainerFocused, ...]}>
  <TextInput
    style={[styles.input, styles.inputNoOutline]}
    onFocus={() => setIsFocused(true)}
    onBlur={() => setIsFocused(false)}
    ...
  />
</View>

const styles = StyleSheet.create({
  inputContainerFocused: {
    borderColor: glassColors.link, // or whatever this screen's accent token is
  },
  inputNoOutline: {
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,
});
```

## Gotchas

- **Don't put the focused border on the `TextInput` style** — it's narrower
  than the container (no icon/toggle-button padding included), so the border
  will visibly not match the box even though the color is now right.
- **The `as any` cast is required and correct** — `outlineStyle`/`outlineWidth`
  aren't part of RN's `TextStyle`, and there's no first-party RN type for
  them. Don't chase a "properly typed" alternative; the cast is the accepted
  pattern here.
- **If the component needs to support programmatic `.focus()`** (e.g. an
  "Enter key advances to next field" flow), wrap it in `React.forwardRef` and
  forward the ref to the inner `TextInput`. `InputWithIcon` already does
  this — pass a `ref` prop and call `ref.current?.focus()` from a parent's
  `onSubmitEditing`.
