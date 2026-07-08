Design tokens: docs/design/tokens.css + docs/design/tokens.json — no hardcoded
colors, use theme vars.
Screen references: docs/design/screens/*.dc.html — static HTML from Claude Design.
Match their layout, spacing, and states, but implement as React/Tailwind components
per docs/05-tech-architecture.md; never copy the HTML wholesale into the app.