# Brand QA — the per-screen checklist

Run this against every new screen before calling it done. Derived from
[BRAND.md](BRAND.md); each line cites its section so a disagreement can be
settled by reading rather than arguing.

Some of these are already enforced by tests and are marked **(tested)** — you
do not need to check them by hand, but you do need to not work around them.

---

## The one-line test

> Would this make someone who is flat, tired, and comparing themselves to who
> they used to be feel *worse*? If maybe, cut it. (BRAND 2)

Everything below is detail. This is the actual standard.

---

## Colour

- [ ] **(tested)** No red, no green-as-good, no traffic-light coding anywhere. There is no bad score. (3.3)
- [ ] `--zeeglas` / `--self` appears only on the person's own input and their own data. (3.3)
- [ ] `--amber` / `--human` appears only where another human has been — a kudos, a comment, a suggested activity, a note from the doctor. (3.3)
- [ ] No amber on a system message. Warmth on screen means *someone was here*. (3.3)
- [ ] **(tested)** All text meets WCAG AA against its actual background, in both themes. Add the new pairing to `packages/ui/src/contrast.test.ts`. (3.3, 5)
- [ ] The screen works in light mode, not only dark. (3.2)

## Type

- [ ] **(tested)** Nothing heavier than weight 500. Hierarchy comes from size and colour. (3.4)
- [ ] Everything the app says is in `--font-ui`. (3.4)
- [ ] Everything a person wrote is in `--font-human`, via `HumanText` and nothing else. (3.4)
- [ ] No serif on a heading, a button, or system copy. (3.4)
- [ ] **(tested)** Data surfaces use tabular figures. (3.4)
- [ ] Layout survives 200% text size. (5)

## Space and shape

- [ ] Section padding at least 24px, 32px on primary screens. (3.5)
- [ ] One screen, one job. If it has two purposes it is two screens. (3.5)
- [ ] Radius: 12px cards, 10px inputs, 999px on the single primary action. (3.5)
- [ ] Hairlines used sparingly; space preferred over lines. (3.5)
- [ ] The screen is not full. Empty space is a feature; density reads as demand. (3.5)

## Motion

- [ ] **(tested)** Nothing slides, bounces, springs or pops. Fade and settle only. (3.6)
- [ ] Durations between 400 and 600ms, easing `cubic-bezier(0.22, 0.61, 0.36, 1)`. (3.6)
- [ ] No loading spinner. A slow opacity pulse on a placeholder shape instead. (3.6)
- [ ] Nothing celebrates. No confetti, no haptic, no animation on completion. (3.6)
- [ ] Completed items grey **in place** — they do not move or disappear, because motion on completion reads as reward mechanics. (PRD 6.2)
- [ ] `prefers-reduced-motion` is respected, including the windline. (3.6, 5)

## Imagery

- [ ] No photographs of people. Not one. (3.8)
- [ ] No mascots, no character illustration, no plant-as-growth-metaphor. (3.8)
- [ ] Icons 1.5px stroke, rounded caps, 24px grid, and only where one is needed. (3.8)

## Copy

Every string lives in `packages/core/src/i18n/`, so most of this is enforced
by `copy-lint.ts`. New copy goes in the dictionary, never inline in a component.

- [ ] **(tested)** No exclamation marks. (4.1)
- [ ] **(tested)** No emoji in system copy. (4.1)
- [ ] **(tested)** `je`, never `u`. (4.1)
- [ ] **(tested)** Never cheerful. No *Goed bezig*, no *Fantastisch*. (4.1)
- [ ] **(tested)** Never compare. No "better than last week", no percentages of progress. (4.1)
- [ ] **(tested)** No streak, badge, points or milestone language. (PRD 4)
- [ ] **(tested)** The wordmark is lowercase. (1)
- [ ] Short declarative sentences, one idea each. (4.1)
- [ ] Invites rather than instructs — *Als je wil*, not *Doe dit nu*. (4.1)
- [ ] Says the plain word. Depression is depression. (4.1)
- [ ] Present tense, active voice. A button says what happens: *Bewaren*. (4.1)
- [ ] Errors state what happened and what to do, without apologising or joking. (4.3)
- [ ] Empty states are an invitation or a permission, never a prompt to do more. (4.3)
- [ ] Both `nl` and `en` say it, and the English mirrors the voice rather than the words.

## Accessibility

- [ ] Every tap target at least 48×48. (5)
- [ ] Full screen-reader labels, including any chart or the windline. (5)
- [ ] Reachable and operable by keyboard, with a visible focus ring.
- [ ] Primary actions in the lower third of the screen; works one-handed. (5)

## Behaviour

- [ ] A missed day produces nothing at all — no prompt, no badge, no gap. (4.1, PRD 6.1)
- [ ] Nothing is chased. One notification per event, at most. (PRD 8)
- [ ] Every notification category can be turned off, and the app still works with all of them off. (PRD 8)
- [ ] The person can see any data the app has collected about them. (PRD 9)
- [ ] Nothing escalates to another human automatically. (PRD 6.1)

---

## Known issues to resolve when they become live

**Amber as text in light mode.** `--amber-l` (#9A6F32) on `--diep-l`
(#EAEEEC) is 3.82:1 — under the AA floor of 4.5 for normal text, though it
passes the 3:1 large-text floor. It is not yet used as a text colour
anywhere; amber currently appears only as an accent.

When the feed lands in Phase 6 and a comment or kudos needs amber *text*,
either draw the text in `--text` and mark it amber some other way, or add an
`--on-surface-human` token at roughly #8A6329, which measures 4.60:1. Add the
pairing to `contrast.test.ts` at the same time.
