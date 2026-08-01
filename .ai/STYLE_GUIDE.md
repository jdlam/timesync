# TimeSync Style Guide

The normative reference for visual and interaction design. Where this file and
a component disagree, this file wins — fix the component.

Companion documents:

| File | Role |
|------|------|
| `.ai/brand-kit.html` | Logo assets, sizing, OG image. Open in a browser. |
| `src/styles.css` | The tokens themselves. Source of truth for values. |
| `.ai/ARCHITECTURE.md` | How code is wired, not how it looks. |

---

## 1. Color

### 1.1 Brand gradient

The brand is a **teal-to-emerald gradient**, always left-to-right or
top-left-to-bottom-right:

```
from-teal-500 to-emerald-500      #14b8a6 → #10b981   (Tailwind utilities)
#0d9488 → #10b981                 (Logo.tsx SVG stops, teal-600 → emerald-500)
```

Note the two are not identical — the SVG logo starts a shade darker than the
Tailwind utility pairing. This is deliberate: the logo needs more weight at
small sizes. Do not "fix" one to match the other.

**Use the gradient for:** logo, wordmark, page-level section headers, hero
emphasis text.

**Never use the gradient for:** button fills, form controls, body copy,
anything that also needs a hover or active state. Gradients do not degrade
gracefully across interaction states.

### 1.2 Semantic tokens

Always prefer the semantic token over a raw Tailwind color. `bg-primary`
survives a rebrand; `bg-teal-600` does not.

| Token | Light | Dark | Use for |
|-------|-------|------|---------|
| `--primary` | teal-600 | teal-600 | Primary CTA fill, focus ring, active nav |
| `--primary-foreground` | white | white | Text on `--primary` |
| `--secondary` | zinc-100 | zinc-800 | Secondary button fill |
| `--muted-foreground` | zinc-500 | zinc-400 | Timestamps, helper text, placeholders |
| `--destructive` | red-600 | red-900 | Delete, revoke, irreversible actions |
| `--border` | zinc-200 | zinc-800 | Dividers, card and input outlines |
| `--accent` | zinc-100 | zinc-800 | Hover fill on ghost/outline buttons |

`--primary` is identical in light and dark on purpose — the brand colour should
not shift with theme. Everything else flips.

### 1.3 Raw teal/emerald — when it is still correct

Semantic tokens do not cover brand-expressive surfaces. Raw utilities remain
correct in three places:

- `text-teal-400` on dark surfaces where `--primary` is too dark to read
- `from-teal-* to-emerald-*` gradient pairs (see 1.1)
- `border-teal-500` on selected/active availability cells

Anywhere else, reach for a token.

### 1.4 Known contrast gap

`--primary` (teal-600, `#0d9488`) on white measures **3.74:1**. WCAG AA for
normal text is 4.5:1, so `<Button>` at its default `text-sm font-medium` does
not pass.

This is not a regression — the previous cyan-600 token measured 3.68:1, so the
retoken slightly improved it while bringing the token in line with the brand.
It is still a real gap.

| Candidate | Contrast on white | AA |
|-----------|------------------|-----|
| cyan-600 (previous) | 3.68:1 | ✗ |
| teal-500 | 2.49:1 | ✗ |
| **teal-600 (current)** | **3.74:1** | **✗** |
| teal-700 `#0f766e` | 5.47:1 | ✓ |
| emerald-500 | 2.54:1 | ✗ |

Switching `--primary` to teal-700 fixes it and touches only `src/styles.css`.
It was not done here because it darkens every primary button, which is a design
call rather than a token cleanup. **Open decision.**

### 1.5 Heatmap scale

The heatmap is the one place colour carries data, so it does not use brand
colours. `getHeatmapColor()` in `src/lib/heatmap-utils.ts` owns the scale — do
not hardcode heatmap colours in components.

| Availability | Colour | Meaning |
|-------------|--------|---------|
| 0% | `oklch(0.30 0.02 240)` dark / `oklch(0.85 0.01 240)` light | Nobody free |
| 1–20% | `oklch(0.55 0.22 15)` red | Very low |
| 21–40% | `oklch(0.65 0.20 50)` orange | Low |
| 41–60% | `oklch(0.75 0.18 90)` yellow | Medium |
| 61–80% | `oklch(0.70 0.18 140)` green | Good |
| 81–100% | `oklch(0.65 0.20 180)` teal | Best — pick this slot |

Colour alone must never be the only signal. Every cell carries the count both
visibly (`{count} of {total} available`) and in its `aria-label` — see
`HeatmapCell.tsx:59-62`. Preserve both when touching that component: a
red-green ramp is unreadable to a meaningful share of users.

---

## 2. Typography

System font stack (`src/styles.css`), `-apple-system` first. No webfonts — the
app must render instantly on a cold mobile connection.

Measured usage across `src/**/*.tsx` gives this scale. `text-sm` is the workhorse
at 171 uses; treat anything above `text-2xl` as a marketing-only size.

| Role | Classes | Mobile | Notes |
|------|---------|--------|-------|
| Hero | `text-4xl font-bold` → `text-5xl` | `text-3xl` | Landing page only |
| Page title | `text-3xl font-bold` | `text-2xl` | One per route |
| Section header | `text-xl font-semibold` | same | Gradient text allowed |
| Card title | `text-lg font-semibold` | same | `CardTitle` applies this |
| Body | `text-sm` | same | **Default. Do not set `text-base`.** |
| Helper / meta | `text-xs text-muted-foreground` | same | Timestamps, hints |

Weights: `font-medium` for interactive labels, `font-semibold` for headings,
`font-bold` for page titles and numerals in stat cards. `font-normal` is the
default and should not be written explicitly.

Inputs are the deliberate exception: `text-base md:text-sm`. 16px on mobile
prevents iOS Safari from zooming on focus. Never drop the `text-base`.

---

## 3. Spacing & layout

Spacing follows a 4px grid. Measured usage clusters hard, so stay in the cluster:

| Step | Class | Used for |
|------|-------|----------|
| 4px | `gap-1` | Icon-to-label inside a control |
| 8px | `gap-2` / `space-y-2` | **Default.** Related elements, form field to label |
| 12px | `gap-3` / `space-y-3` | Sibling controls, list rows |
| 16px | `gap-4` / `space-y-4`, `p-4` | Card interiors, form sections |
| 24px | `space-y-6`, `p-6` | Between form sections, card padding on desktop |
| 48px | `py-12` | Between page sections |
| 80px | `py-20` | Landing page section rhythm |

`gap-5`, `gap-7`, and arbitrary values like `p-[13px]` are not in the system.

Radius derives from `--radius: 0.625rem` (10px). Use `rounded-lg` for cards and
containers (61 uses), `rounded-md` for controls (28 uses), `rounded-full` for
avatars and pills. `rounded-xl` is reserved for landing-page feature cards.

Elevation is sparing: `shadow-xs` on inputs and outline buttons, `shadow-md` on
raised cards, `shadow-lg` on popovers and dialogs. Nothing else.

---

## 4. Mobile-first

Non-negotiable, per the project's design philosophy. Write the mobile styles as
the unprefixed base, then add `sm:` / `md:` / `lg:`. Never write
`md:flex-col` to undo a desktop-first default.

- **Touch targets are 44×44px minimum.** `min-h-[44px]` where a control would
  otherwise be smaller. Note `Button` defaults to `h-9` (36px) — that is below
  the floor, so any button that is a *primary mobile action* needs an explicit
  `size="lg"` (40px) plus `min-h-[44px]`, or a wrapping tap area.
- No horizontal page scroll. Wide content — grids, tables — scrolls inside its
  own `overflow-x-auto` container.
- Time-based grids always show time labels, even at 320px. Truncate the label,
  never drop it.
- Tables collapse to stacked cards below `sm:`. See `MyEventsTable.tsx` and
  `EventsTable.tsx` for the established pattern.
- Primary actions stay reachable one-handed: sticky bottom bar on long forms,
  not a button below the fold.

Breakpoints in use: `sm:` (640px) for table→card collapse, `md:` (768px) for
grid columns, `lg:` (1024px) for header layout. `xl:` and above are unused —
do not introduce them without a reason.

---

## 5. Components

### 5.1 Buttons

Defined by `buttonVariants` in `src/components/ui/button.tsx`.

| Variant | Use for | Rule |
|---------|---------|------|
| `default` | The one action the user came to do | **Max one per view** |
| `outline` | Secondary action beside a primary | Cancel, Back |
| `secondary` | Tertiary action in a dense toolbar | |
| `ghost` | Icon buttons, low-emphasis row actions | |
| `link` | Inline navigation inside prose | Not for actions |
| `destructive` | Irreversible: delete, revoke | **Always behind `AlertDialog`** |

Sizes: `default` (h-9), `sm` (h-8), `lg` (h-10), `icon` / `icon-sm` / `icon-lg`.
Icon-only buttons require `aria-label`.

Every variant defines `hover:`, `active:`, and `disabled:` states. If you add a
variant, define all three — a control with no active state feels broken on
touch, where there is no hover to fall back on.

### 5.2 Cards

`Card` / `CardHeader` / `CardTitle` / `CardContent` / `CardFooter`. Padding is
`p-6` on desktop, `p-4` on mobile. Do not nest a Card inside a Card — use a
bordered `div` with `rounded-lg border` instead.

### 5.3 Feedback

Toasts via `sonner`. Measured usage: 24 `toast.error`, 19 `toast.success`,
1 `toast.info`.

- `toast.success` — a write succeeded and the user cannot otherwise see it
- `toast.error` — a write failed; **state what to do next**, not just what broke
- `toast.info` — rare; prefer inline text
- Never toast on read. Never toast to confirm something already visible.

Validation errors belong inline under the field, in `text-sm text-destructive`.
Toasts are for outcomes, not for validation.

### 5.4 States

Every view that reads data needs all four. Convex `useQuery` returns `undefined`
while loading, which is the loading signal.

| State | Treatment |
|-------|-----------|
| Loading | `<Loader2 className="animate-spin ..." />` from `lucide-react` |
| Empty | Icon + one line of what goes here + the action that creates it |
| Error | Plain sentence + a retry affordance. Never a raw error string. |
| Populated | The real thing |

Loading uses a centred spinner, not a skeleton — that is the established
convention across every route. Sizes by context:

| Context | Classes |
|---------|---------|
| Full route | `animate-spin h-8 w-8 text-muted-foreground`, centred |
| Inside a button | `animate-spin h-4 w-4 mr-2`, label becomes "Saving…" |
| Inline / badge | `animate-spin h-3.5 w-3.5` |

Skeletons would reduce layout shift on the heavier admin views, but no
skeleton exists in the codebase today. Do not introduce one ad hoc — if it is
worth doing it is worth doing everywhere, so raise it first.

Empty is not an error. "No responses yet" is a normal state of a new event and
should read as an invitation to share the link, not as a failure.

---

## 6. Interaction

- **Cursor:** every clickable element shows `cursor: pointer`. Enforced globally
  in `src/styles.css` for buttons, links, and ARIA interactive roles. Disabled
  elements are excluded. Custom clickables need semantic HTML or an ARIA role to
  inherit this.
- **Focus:** `focus-visible:ring-ring/50 focus-visible:ring-[3px]`. Never
  `outline: none` without a replacement — keyboard users lose the page.
- **Transitions:** `transition-all` on interactive elements, default duration.
  No custom easing curves.
- **Motion:** the logo's motion lines are decorative and marked `aria-hidden`.
  Nothing in the app animates on a loop.

---

## 7. Dark mode

Every surface must work in both themes. Dark is activated by `.dark` on an
ancestor (`@custom-variant dark (&:is(.dark *))`).

Use tokens and dark mode is free. When a raw colour is unavoidable, pair it:
`text-teal-600 dark:text-teal-400` — the light-mode shade is too dark to read on
a dark background, and vice versa.

Check both themes before considering any UI change done.

---

## 8. Accessibility floor

- Semantic HTML first: `<button>` for actions, `<a>` for navigation. A `<div>`
  with an `onClick` is a bug.
- Every icon-only control has an `aria-label`.
- Every input has a `<label>`, or `aria-label` where a visible label would be
  redundant.
- Full keyboard operability, focus visible at every stop.
- Colour is never the sole carrier of meaning — see 1.5.
- Text contrast target is 4.5:1. See 1.4 for the one known exception.

---

## 9. Open items

| Item | Detail |
|------|--------|
| Primary contrast | `--primary` at 3.74:1 fails AA. teal-700 fixes it. See 1.4. |
| Gradient drift | Logo SVG uses teal-600→emerald-500; utilities use teal-500→emerald-500. Documented as intentional; confirm. |
| Button touch floor | `Button` defaults to h-9 (36px), below the 44px mobile floor. No systematic enforcement today. |
| Mockups | `.ai/mockups/*.html` are untracked explorations, not normative. Delete or commit them. |
