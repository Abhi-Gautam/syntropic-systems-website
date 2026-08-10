# AGENTS.md

## Project

Syntropic Systems is Abhishek Gautam's personal engineering publication at `https://syntropicsystems.dev`.

The site exists to publish build logs, system explanations, project documentation, and small interactive demonstrations. Public material must come from firsthand engineering work, investigation, or review.

## Current architecture

Version zero is deliberately dependency-free:

- `index.html` contains the page structure and copy.
- `styles.css` contains the full responsive design system.
- `favicon.svg` is the site mark.
- No framework, package manager, runtime JavaScript, CMS, or build step.

Do not add a framework until multiple real pages create a demonstrated need for shared layouts, content collections, or interactive components.

## Local commands

Serve the site:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

Run repository checks:

```bash
python3 scripts/verify.py
```

## Content rules

- Do not invent projects, metrics, article titles, dates, testimonials, or credentials.
- Separate observed facts, user-confirmed facts, and inference.
- Explain causal mechanisms instead of repeating technology claims.
- Prefer source code, measurements, diagrams, and reproducible demonstrations.
- Preserve Abhishek's opinion and first-person voice.
- AI may organize, research, challenge, and edit. It must not manufacture experience or reasoning.
- Avoid generic AI prose, SEO filler, and empty conclusions.

## Design rules

- Turbopuffer is the primary reference for restraint: plain typography, black/white/quiet gray, simple rules, and content before decoration.
- Use one simple monospace stack. Keep headlines at normal reading sizes.
- The site should feel like a useful technical page, not an art-directed portfolio or SaaS landing page.
- Do not add serif display type, oversized statements, gradients, glassmorphism, fake terminals, dashboards, card grids, numbered editorial indexes, manifesto blocks, stock imagery, or decorative metrics.
- Keep every interactive target at least 44px.
- Preserve visible keyboard focus, semantic HTML, high contrast, and reduced-motion support.
- Verify desktop and narrow mobile layouts after visual changes.

## Git discipline

- Keep generated files and machine-specific state out of the repository.
- Never commit secrets, tokens, `.env` files, or deployment credentials.
- Keep commits narrow and describe the user-visible change.
- Do not deploy or modify DNS without explicit confirmation of the target.
