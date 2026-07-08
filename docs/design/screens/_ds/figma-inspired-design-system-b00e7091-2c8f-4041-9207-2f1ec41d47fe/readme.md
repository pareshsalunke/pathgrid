# Figma-Inspired Design System

A design system recreating the **Figma-inspired design language** documented in VoltAgent's *awesome-design-md* collection: a rigorously monochrome editorial frame — white canvas, black ink, pill CTAs, one variable sans voice — interrupted by oversized hand-cut pastel **color blocks** (lime, lilac, cream, mint, pink, coral, navy) that carry the storytelling. Technical and joyful: a tool for serious work, made by people who like color.

> **Provenance & scope.** Built from the MIT-licensed design analysis at
> https://github.com/VoltAgent/awesome-design-md (`design-md/figma/DESIGN.md`, "Figma-design-analysis", version alpha) —
> an *inspired interpretation* of publicly visible CSS on figma.com marketing pages (home, /design/, /figjam/, /pricing/, /contact/).
> It is **not** an official Figma asset and documents the **marketing surface**, not the product editor.
> Explore the repo (and https://getdesign.md/figma/design-md) to go deeper when building against this language.
> No logo files exist in the source, so **no logo is reproduced anywhere in this system** — the wordmark is set in plain type instead.

## Products represented

- **Marketing surface** (the documented source): figma.com-style pages — hero, color-block story sections, pricing, contact.
- **App dashboard UI kit** (in `ui_kits/dashboard/`): a file-browser/dashboard surface **composed from the documented marketing vocabulary** (top nav, surface-soft tiles, pill buttons, hairline tables). The source does not document Figma's real product UI, so this kit is an application of the language — not a recreation of the actual editor.

## CONTENT FUNDAMENTALS

How copy is written in this language (grounded in the CTAs and labels the source documents):

- **Sentence case everywhere** — headlines, buttons, links. Never Title Case, never ALL CAPS in sans. `Get started for free`, `Contact sales`, `Save your spot`.
- **The only uppercase is mono taxonomy.** Eyebrows and captions are set in the mono face, always uppercase, with positive tracking: `DESIGN SYSTEMS`, `FREE FOREVER`. Taxonomy, never body copy.
- **Short, confident, benefit-first.** Headlines are declarative fragments at poster scale; body copy is one or two plain sentences. No exclamation marks needed — scale does the shouting.
- **Direct address**: "you/your" to the reader; the product is named, not "we". CTAs are imperatives ("Get started", "Contact sales").
- **No emoji.** Joy comes from color blocks and type, not glyphs.
- **Hierarchy by weight, not words.** Emphasis inside a paragraph is weight 480 (link voice) against weight 320 body — avoid bold-shouting or italics.
- **Numbers set in mono** when used as captions/labels (e.g. `01`, `02` section indices).

## VISUAL FOUNDATIONS

- **Color.** Monochrome system core: pure black `#000000` and pure white `#ffffff` carry every CTA, headline, body line, and the footer. Seven pastel color-block surfaces (`--color-block-*`: lime `#dceeb1`, lilac `#c5b0f4`, cream `#f4ecd6`, pink `#efd4d4`, mint `#c8e6cd`, coral `#f3c9b6`, navy `#1f1d3d`) define narrative rhythm. One saturated accent — magenta `#ff3d8b` — reserved for a single promo CTA per page. Success green `#1ea64a` is a glyph fill only. **No mid-gray text exists**: body hierarchy comes from font weight, never opacity.
- **Type.** One variable sans (`figmaSans`; substituted with **Inter Variable** here) at fine weight increments — 320 body, 330 small body, 340 display, 480 link/button, 540 headline, 700 card titles. Display sizes pull aggressive negative tracking (−1.72px at 86px, −0.96px at 64px) with line-height 1.0–1.1; body runs 1.4–1.45. Mono (`figmaMono`; substituted with **JetBrains Mono**) is exclusively for uppercase eyebrows (18px, +0.54px) and captions (12px, +0.6px).
- **Spacing.** 8px base unit. Cards pad 24px; color blocks pad 48px; major sections sit 96px apart — the universal rhythm constant. Content maxes at 1280px. Documented odd values are copied exactly (button-secondary pads `8px 18px 10px` — asymmetric on purpose).
- **Backgrounds.** Flat color only — no gradients, no textures, no photography as background. The page returns to white canvas between every two color blocks; never two blocks in one viewport. Below 768px, blocks go full-bleed (corners removed) for a poster effect.
- **Corner radii.** 2px link decorations · 6px chips/sticky-notes · 8px inputs, tiles, image frames · 24px pricing cards & color blocks · 32px hero panels · 50px pill (ALL text CTAs) · 9999px circles (icon buttons, check glyphs). **No square buttons anywhere.**
- **Elevation.** Shadow-light by design — color blocks substitute for elevation. L0 flat (blocks, hero, footer) · L1 1px `#e6e6e6` hairline (cards, inputs, table cells) · L2 soft `0 4px 16px rgba(0,0,0,0.06)` (floating tiles, dropdowns) · L3 modal shadow over a 60% black scrim. Never shadow a color block.
- **Cards.** White, hairline-stroked, 24px radius (pricing) or surface-soft `#f7f7f5` fill, 8px radius (template tiles) — stroked or tinted, never shadowed by default.
- **Buttons.** Pills only. Primary = black fill/white text; secondary = white fill/black text, no border; tertiary = plain text with pill hit-target; icon buttons = 40px circles (surface-soft on light, 16% white on dark). Selected tab = exactly the primary surface.
- **Interaction states.** Pressed relies on micro-scale (~0.98), not darkened fills. Focus is a ring, not a fill change. Hovers stay quiet: slight tint or underline, never color shifts into new hues.
- **Animation.** Undocumented in the source (no-interaction policy) beyond: template thumbnails lazy-load and animate in on scroll; the logo marquee scrolls continuously. Keep motion minimal and linear; FigJam sticky-notes hold a slight off-axis rotation at all breakpoints — that tilt is a brand signal.
- **Imagery.** Product-UI mocks presented as flat compositions inside color blocks, 8px-radius frames, never cropped — scaled down on small screens. No avatars, no photography of people in marketing surfaces.

## ICONOGRAPHY

- **The source documents no icon system** — the only documented glyphs are the green comparison checkmark (16px circle, green glyph on white) and circular icon-button arrows/social glyphs.
- **This system ships [Lucide](https://lucide.dev) icons** (`assets/icons/*.svg`, MIT) as the nearest-match substitute: 24px grid, 2px stroke, `currentColor`, round caps — consistent with the thin editorial line-work of the language. **This is a substitution — flag to users.**
- Usage: inline the SVG or `<img>` it; size 16–24px; color inherits text ink. Icons appear inside 40px circular buttons or beside labels — never as decoration floods.
- No icon font, no emoji, no unicode-as-icon. Checkmarks use `--color-success` as glyph fill only.
- **No logo asset exists in the source repo.** Anywhere a brand mark would sit, render the wordmark in plain type (sans, weight 540). Do not draw or approximate Figma's real mark.

## Index

- `styles.css` — global entry (imports everything below)
- `tokens/` — `colors.css` · `typography.css` (roles + `.type-*` classes) · `spacing.css` · `radius.css` · `elevation.css` · `fonts.css` (@font-face) · `base.css`
- `assets/fonts/` — InterVariable.woff2, JetBrainsMono.woff2 · `assets/icons/` — 25 Lucide SVGs
- `guidelines/` — foundation specimen cards (colors, type, spacing, radius, elevation, buttons)
- `components/` — the source's full component inventory, grouped:
  - `actions/` — **Button** (primary · secondary · tertiary · magenta-promo), **IconButton** (light · inverse)
  - `forms/` — **TextInput**, **PillTabs** (selected = primary surface)
  - `cards/` — **PricingCard** (+ feature rows), **TemplateCard**, **FeatureTile**
  - `sections/` — **ColorBlock** (7 surfaces), **PromoBanner**, **MarqueeStrip**
  - `navigation/` — **TopNav**, **Footer**
  - `glyphs/` — **Checkmark**
- `ui_kits/dashboard/` — app-dashboard UI kit (`index.html` interactive demo + screen JSX)
- `templates/` — consumer starting points: `landing-page/` (marketing page in the documented rhythm) · `dashboard/` (interactive file-browser shell)
- `SKILL.md` — agent skill entry point

### Intentional additions
- **Lucide icon set** (`assets/icons/`) — the source documents icon *buttons* but ships no glyphs; an icon set is required to render them. Substitution flagged above.

### Known gaps (inherited from the source)
- Pastel block hexes are screenshot-derived approximations.
- No dark mode (navy block + black footer are the only dark surfaces).
- Form error/validation states undocumented.
- Marquee + color-block reveal animations undocumented.
- The product editor UI is undocumented — the dashboard kit extrapolates from marketing vocabulary.
