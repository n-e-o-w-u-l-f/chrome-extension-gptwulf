# GPT-Wulf ChatGPT DOM Notes

## Verification status

**Last verified: 2026-08-14**

The repository was inspected remotely and the provided current Composer submit-button HTML was used as an implementation starting point. A real authenticated ChatGPT browser session was **not available to this development workflow**, so the live DOM, computed styles, and generating-state transition have not been independently verified here.

Therefore the implementation deliberately treats all ChatGPT selectors as replaceable evidence, not a stable API.

## Known starting evidence

The project specification supplied these selectors:

- `[data-testid="send-button"]`
- `#composer-submit-button`
- SVG `<use>` with a send-prompt sprite reference

The adapter uses those selectors first and falls back to semantic `aria-label` evidence only within the detected lower composer context.

## Composer detection

The adapter currently:

1. considers `textarea` and `[contenteditable="true"]` candidates;
2. requires visibility and a meaningful bounding box;
3. requires the candidate to be in the lower portion of the viewport;
4. prefers the lowest visible candidate;
5. finds the submit button in the candidate's ancestor context where possible.

This is intentionally conservative and should be revalidated against the live UI.

## Send / stop detection

Evidence is collected from:

- `disabled`
- `aria-label`
- `data-testid`
- button class name
- SVG `<use>` href / xlink:href

A stop/cancel signal is classified as `GENERATING`. A send signal is classified as `SEND` or `SEND_DISABLED`.

Unknown evidence remains `UNKNOWN` and cannot pass the send guard.

## SPA navigation

The content script observes `popstate` and wraps `history.pushState` / `history.replaceState` to schedule a state refresh. Conversation changes reset the Auto Reply submission lock.

## Theme

The content UI uses isolated `.gptwulf-*` selectors and an automatic light/dark media query. Exact ChatGPT computed colors have not been claimed as verified because a live authenticated browser inspection was unavailable.

## Required live verification before release

- READY with a real empty/non-empty Composer
- GENERATING while ChatGPT is producing a response
- return to READY after generation
- Chat switch without duplicate submission
- page reload without automatic submission
- Light Mode
- Dark Mode
- contenteditable Composer, if present
- actual send button click behavior
