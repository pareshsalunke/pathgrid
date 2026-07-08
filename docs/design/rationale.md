# pathgrid — design rationale (styling context for Claude Code)

pathgrid is rendered in the **Figma-inspired design language**: a rigorously monochrome
black-on-white editorial frame, interrupted by oversized pastel **color blocks**, with
one variable sans (Inter) and a mono taxonomy face (JetBrains Mono). The bound design
system lives at `_ds/figma-inspired-design-system-*/`; every screen loads its token
stylesheets. This doc records how pathgrid's product concepts map onto that language.

## Identity — the pathgrid mark
The name is literal: the learning **path**, drawn on the canvas **grid**. The wordmark
is always lowercase, one word — `pathgrid` — never "PathGrid" or "Path Grid" (a capital
appears only if the word opens a prose sentence). The mark is a polyline connecting 3
nodes, ascending bottom-left to top-right, over a faint dot grid — ink black, with one
lilac accent node at the path's end, echoing the roadmap canvas's own selected-node
ring. It reduces cleanly to a favicon (the grid recedes at small sizes; the polyline +
nodes carry the mark alone). Grid texture is a legitimate, sparing background motif on
hero and empty states elsewhere — never dense enough to compete with content. This mark
is original; it does not reproduce roadmap.sh's or any other product's branding.

## The one move that matters
The brief asked for "two worlds": chrome framing a light canvas. We keep that contrast
**inside the Figma system** rather than inverting to dark. Navigation, catalog, AI hub,
dashboard and settings are the white/black editorial frame. The roadmap canvas is the
single **warm surface** — cream (`#f4ecd6`) paper with a faint dot grid — so the map
reads as a document you own. The chrome is white; the canvas is cream; the jump between
them is the signature. No cream inside the chrome, no white canvas behind the nodes.

## Color logic
- **Black is primary.** Every CTA, selected tab, progress fill, and node border is pure
  black. If it's an action or "on", it's black — not a color.
- **Pastel blocks carry story and state.** Lime = generate/systems; cream = canvas +
  warm strips; navy = rare dark moment; coral = attention/alert; lilac = AI, topic
  nodes, and calm BYOK/reassurance notes; mint = done. Return to white canvas between
  any two blocks so each reads as deliberate. Never shadow a color block — the color
  *is* the elevation.
- **Magenta (`#ff3d8b`) is documented by the design system but unused in pathgrid** —
  the product has no promo or pricing surface to spend it on (see "No monetization
  surface" below). It remains available in the token sheet if a future promo need
  arises, but nothing in the current build reaches for it.
- **No mid-gray text.** Body hierarchy comes from weight (320 body vs 480 emphasis),
  never opacity or gray. Secondary meta is mono uppercase caption, not gray sans.
- **Green (`#1ea64a`) is a glyph fill only** — the done checkmark, never a surface.

## No monetization surface
pathgrid is a personal, freely-distributable BYOK (bring-your-own-key) tool — the
product spec names monetization of any kind (payments, plans, meters, pricing pages) an
explicit non-goal; users pay their own AI provider directly. Practically this means:
no pricing screen, no "N of N free generations/messages used" meters, no upgrade nags.
Where a usage readout is useful, it states a fact calmly (token/cost this session,
provider chip) rather than gating or upselling — see "AI presence" below. The one
"No limits" note in the AI hub rail and component board exists to reassure, not to sell.

## The roadmap canvas (nodes as sticky-notes)
- Cream ground + dot grid. Black 2px solid edges; **dashed** edges = optional.
- **Title** node: white, 2.5px black border, 700 weight. **Topic** node: lilac fill,
  2px black border. **Subtopic** node: white, 2px black border. Slight paper lift
  (`0 2px 0` offset), no soft shadow.
- **States:** done = mint fill + white circle with green check; learning = black
  selection ring (`0 0 0 3px cream, 0 0 0 5px ink`) — "selected = primary"; skipped =
  40% opacity + strikethrough; optional = dashed border, no fill. State changes animate
  150–200ms; respect `prefers-reduced-motion`.
- Legibility beats decoration: all node text is pure black on its pastel.

## Type
Inter for everything, at fine weights (320/330/340/480/540/700) — one voice that flexes.
JetBrains Mono, uppercase with positive tracking, for eyebrows, meters, taxonomy chips,
and numeric readouts ("1,842 tokens · ~$0.01", "44%"). Display sizes pull hard negative
tracking (-0.02 to -0.03em) at line-height ~1.0; body runs 1.4–1.45. Sentence case
everywhere; the only uppercase is mono.

## AI presence
Calm, never gimmicky. The active provider is a quiet mono chip ("Claude Sonnet" + green
dot); token/cost readouts are mono captions, informational only — never a limit. The
generate flow is a plain stepper (outline -> graph -> layout). Every AI-drafted surface
carries the "AI-drafted · human-reviewed" mono footnote. No usage meters or upgrade
prompts anywhere in the product.

## Shape, depth, motion
Pills are the only CTA shape (`50px`); icon buttons are 40px circles. Cards and color
blocks are 24px radius; inputs, tiles and nodes 8px. Elevation is shadow-light: 1px
hairline for cards/inputs, soft shadow only for floating tiles/dropdowns, modal shadow
for the drawer. Pressed = micro-scale (~0.98); focus = 2px black ring, never a fill
change; hovers stay quiet (surface-soft tint or underline).

## Voice
Verbs on buttons ("Generate roadmap", "Mark as done", never "Submit"). Meters state
facts. Empty states give one action. No exclamation marks in chrome.

## Global navigation (IA §1)
The header and footer are shared components — `AppHeader.dc.html` and `AppFooter.dc.html`
— mounted on every screen so the frame is identical everywhere. Per the IA, the header
carries two dropdown menus (icon + title + subtitle rows): **Roadmaps** (all roadmaps,
get started, projects, guides, best practices) and **AI Tutor** (create with AI, roadmap
chat, ask the tutor, test my skills). Logged-out shows Log in + Sign up; logged-in shows
a search icon and an avatar menu (Dashboard, My learning, Settings, Log out). The header
stays in the white editorial frame — never dark — so the two-worlds contrast lives only
at the canvas (see "The one move that matters"). The footer gathers product + company
links, social icons, the newsletter capture and the AI footnote; it rides on the content
pages (Home, Roadmap), while the app shells (AI hub, tutor, dashboard, settings) keep a
minimal or no footer. The AI hub's create rail follows the IA's three modes — **Roadmap /
Course plan / Quiz** — and Settings closes with an **Account** section (sign out, delete).

## Files
- `tokens.json` / `tokens.css` — canonical values + the pathgrid semantic layer.
- `Components.dc.html` — component board with states (14 specimens).
- `Home / Roadmap / AI Hub / Tutor Chat / Dashboard / Settings / Auth .dc.html` — the
  screens. Interactive (node status, drawer, tabs, generate flow, API-key states);
  responsive from 1440 down to ~390 via intrinsic flex/grid, no fixed breakpoints.
  No Pricing screen — see "No monetization surface" above.
- `AppHeader.dc.html` / `AppFooter.dc.html` — the shared global nav + footer (IA §1),
  imported by every screen via `<dc-import>`.
