# Syntropic Systems

The source for [syntropicsystems.dev](https://syntropicsystems.dev), Abhishek Gautam's public engineering notebook.

The site will contain:

- build logs from software projects;
- first-principles notes on software systems;
- small demonstrations that make abstractions observable.

## Run locally

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173>.

## Architecture

Version zero uses plain HTML and CSS. There is no build step or runtime dependency. This is intentional: the site will earn additional machinery only when published material needs it.

## Publishing standard

Every substantial piece should contain firsthand work, a concrete technical question, causal reasoning, and evidence such as source code, measurements, diagrams, or a reproducible demo.

See [`AGENTS.md`](AGENTS.md) for the complete content and design rules.
