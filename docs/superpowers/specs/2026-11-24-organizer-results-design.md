# Organizer Results View — Design

## Intent
When participants don't get their emails or have trouble with the dashboard, the organizer should be able to give tech support for their own exchange. A new dashboard section shows organizers who drew whom in exchanges they organized.

## Goals
- Organizers see, per exchange they organized: each giver, the giver's email (to spot typos), and their recipient.
- In Secret Santa exchanges, the line where the **organizer is the recipient** is blurred. The organizer clicks it to reveal it if they really need to.
- For link-mode exchanges (participants draw their own names), show who has and hasn't drawn yet.

## Non-goals / anti-goals
- No resend-email button (separate future idea).
- Must not expose any exchange's results to non-organizers.
- The blur is a courtesy against accidental spoilers, not a security boundary. The organizer already can email themselves full results via `api-results-email-post`.

## Approaches
- **Chosen (A): extend `api-my-exchanges-get`.** For exchanges where `exchange.organizer` equals the user, include the giver → recipient pairs. No new endpoint, and the dashboard already loads this data.
- Rejected (B): a new organizer-only results endpoint loaded on demand. It's cleaner separation, but it adds an endpoint for data the dashboard nearly has.

## Design
### Backend: `netlify/functions/api-my-exchanges-get.mjs`
- **Regular exchanges** (`exchanges` collection) where `organizer` equals `event.user._id`: add `isOrganizer: true` and a `results` array.
  - Each entry is `{giverName, giverEmail, recipientName, recipientIsYou}`, built from `assignments` and the already-fetched participant users.
  - `recipientIsYou` is `recipientId.equals(user._id)`.
- **Exchanges the user only participates in:** unchanged. No `results`; `isOrganizer: false` or absent.
- **Link exchanges** (`linkExchanges`, already filtered to `organizer: user._id`):
  - Add `isOrganizer: true` and `results` entries `{giverName, recipientName, hasDrawn}` from `participants`.
  - Show `recipientName` only when `hasDrawn` is true.
  - Link participants are plain names with no user ids. Names are unique within an exchange (validated by `api-link-exchange-post`), so identify the organizer by matching `event.user.name` to a participant name, trimmed and case-insensitive. Set `recipientIsYou` on the entry whose `recipientName` is that participant.
  - If no participant name matches (the organizer typed a different name, or isn't participating), set `organizerMatched: false` on the exchange. The frontend then blurs every drawn recipient individually, so a mismatch can't spoil anything (approved).
- **Existing fields stay as they are.** `participants`, `participantNames` and `houses` keep their current shape, because "Use This Exchange" (`ReuseSection.js`) stores the whole exchange object in `sessionStorage`. `results` riding along there is harmless.

### Frontend: new dashboard section
- New section id `organized`, label "Exchanges You Organized", in `src/dashboard/index.js`, with a new component (e.g. `src/dashboard/components/OrganizedSection.js`). It follows the existing section/component patterns and CSS modules.
- **Visibility:** only for users who organized at least one exchange. The sidebar is rendered once from `SECTIONS` at layout time; the builder decides how to gate it. Options: fetch `api-my-exchanges-get` before layout, or render with the nav item hidden and reveal it once data shows organized exchanges. Visiting `/dashboard/organized` directly with nothing organized shows an empty state.
- **Per exchange card, newest first:**
  - Date and mode (Secret Santa / link / regular).
  - A row per giver: name, email (regular exchanges), → recipient name. Link mode shows a "hasn't drawn yet" status instead of a recipient.
- **Blurring:**
  - **Secret Santa:** the row with `recipientIsYou` renders the giver's name and email blurred, with a click/keyboard-activatable control to reveal (CSS `filter: blur`, a button for accessibility).
  - **Link mode:** same as Secret Santa when the organizer's name matched: only the `recipientIsYou` row is blurred. When `organizerMatched` is false, each drawn recipient is blurred and reveals individually.
  - **Non-Secret-Santa regular exchanges:** no blur; results were shown openly when drawn.
- All user-supplied strings are escaped (`escape`/`escapeAttr` from `utils.js`).
- Works in admin view-as mode (read-only GET).

## Testing
- **Backend:** extend `spec/netlify-functions/api-my-exchanges-get.spec.js` to check:
  - organizer gets `results`;
  - a participant who is not the organizer gets none;
  - `recipientIsYou` is set correctly;
  - link-mode `hasDrawn` handling and no recipient shown before drawing; link-mode organizer matched by name (case/whitespace-insensitive) vs `organizerMatched: false`.
- **Frontend:** new spec under `spec/dashboard/` (already covered by the `frontend-pages` project glob) to check:
  - the section hides with no organized exchanges;
  - rows render;
  - the blur applies only to the right rows and reveals on click;
  - escaping is applied.

## Left to the builder
Exact layout/styling, mode label wording, nav gating mechanism, and the component split.
