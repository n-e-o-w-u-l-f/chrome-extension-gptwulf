# GPT-Wulf ChatGPT DOM Notes

## Verification status

**Last repository verification: 2026-08-14**

The repository has been inspected and the DOM/state safety layer has been hardened. A real authenticated ChatGPT browser session is **still not available to this development workflow**, so the live DOM, computed styles, actual click behavior, and live generating transition have **not** been independently verified.

Therefore the project must not claim current ChatGPT browser compatibility as proven until the live checklist below is completed.

## Current DOM evidence

The adapter uses these known signals as evidence, not as a stable API:

- `#prompt-textarea` before generic `textarea`
- `textarea`
- `[contenteditable="true"]`
- `button[data-testid="send-button"]`
- `#composer-submit-button`
- semantic `aria-label` / `title` / `data-testid` signals inside the detected composer context
- SVG `<use>` href / xlink:href as supplementary button evidence

Submit buttons are now resolved strictly inside the detected composer context. If that association cannot be established, the adapter returns no button rather than selecting an unrelated visible button elsewhere on the page.

## Composer detection

The adapter currently:

1. checks specific composer selectors before generic text inputs;
2. requires visibility and a meaningful bounding box;
3. requires the candidate to be in the lower portion of the viewport;
4. prefers the lowest visible candidate;
5. associates the submit button with that composer context;
6. falls back to semantic evidence only inside that context.

This is intentionally conservative and must be revalidated against the live UI.

## State safety

The state engine distinguishes `UNKNOWN`, `EMPTY`, `READY`, `SUBMITTING`, `GENERATING`, `ERROR`, and `NOT_CHATGPT`.

A non-empty composer with a disabled send button is now `UNKNOWN`, not `EMPTY`. `UNKNOWN` is always send-blocking.

The safe-send path re-evaluates the state, composer, submit button, button mode, confidence, and `disabled` property immediately before the click. After the click, submission is accepted only when `GENERATING` is observed. A return to `READY` without an observed `GENERATING` transition is treated as an unverified submission.

## Auto Reply and navigation

Auto Reply requires an explicit enable action. A reload does not automatically resume a submission. On conversation change, the Auto Reply lock, generation marker, last submission, pending activation, and pending Repeat Mode timer are reset. Resetting the lock does not submit anything.

Repeat Mode is scheduled only after a verified `GENERATING -> READY` transition. A pending repeat timer is cancelled by `resetLock()`.

## Local behavior tests

`tests/behavior.test.js` isolates the state engine, safe-send guard, and Auto Reply lock using small adapters/mocks. `tests/static.test.js` additionally checks syntax, manifest restrictions, safe-send invariants, navigation lock reset, and absence of network/cookie/credential access primitives.

These tests validate the safety logic but do **not** substitute for live ChatGPT verification.

## Reproducible live browser checklist

Run this manually in a dedicated Chrome profile with the unpacked extension loaded. Use a real authenticated ChatGPT session. Record the result of every item; do not mark compatibility as verified from partial success.

1. Open `https://chatgpt.com/` and confirm the extension initializes without automatically submitting.
2. New/empty conversation: verify composer detection and `EMPTY`.
3. Enter ordinary text: verify `READY` and an enabled send button.
4. Remove the text: verify `EMPTY`.
5. With text present and the send control disabled/unavailable: verify `UNKNOWN` and confirm no submission is possible.
6. Manually send a prompt and verify `SUBMITTING -> GENERATING`.
7. During generation, confirm Auto Reply cannot submit another prompt.
8. Wait for completion and verify `GENERATING -> READY`.
9. Switch to another conversation and verify the submission lock resets without sending anything.
10. Reload the page and verify settings/UI restore without automatic submission.
11. Explicitly enable Auto Reply while `READY` and verify exactly one submission.
12. Disable Auto Reply during generation and verify no later submission occurs.
13. Enable Repeat Mode and verify another submission occurs only after a complete `GENERATING -> READY` cycle.
14. Rapidly toggle/activate Auto Reply and verify duplicate submission does not occur.
15. Repeat the relevant checks in Light Mode.
16. Repeat the relevant checks in Dark Mode.
17. Verify a native `textarea` composer if present.
18. Verify a `contenteditable` composer if present.
19. Confirm the actual send-button click sends exactly one visible prompt.
20. Confirm no reload, navigation, or DOM mutation by itself causes a submission.

## Release gate

Until the checklist above has been performed successfully in a real browser session, the repository status is:

**Automated safety tests: verified locally in the development environment.**

**Live ChatGPT DOM/E2E compatibility: not verified.**
