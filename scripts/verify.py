#!/usr/bin/env python3
"""Dependency-free checks for the static Syntropic Systems site."""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
REQUIRED_FILES = [
    INDEX,
    ROOT / "styles.css",
    ROOT / "favicon.svg",
    ROOT / "README.md",
    ROOT / "AGENTS.md",
    ROOT / ".gitignore",
    ROOT / ".nojekyll",
]


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.local_references: list[str] = []
        self.ids: set[str] = set()
        self.duplicate_ids: set[str] = set()
        self.has_title = False
        self.has_description = False
        self.has_h1 = False
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        element_id = values.get("id")
        if element_id:
            if element_id in self.ids:
                self.duplicate_ids.add(element_id)
            self.ids.add(element_id)

        if tag == "title":
            self._in_title = True
        elif tag == "h1":
            self.has_h1 = True
        elif tag == "meta" and values.get("name") == "description" and values.get("content"):
            self.has_description = True

        attribute = "href" if tag in {"a", "link"} else "src" if tag in {"img", "script"} else None
        if not attribute or not values.get(attribute):
            return

        reference = values[attribute]
        parsed = urlparse(reference)
        if not parsed.scheme and not reference.startswith(("#", "/")):
            self.local_references.append(parsed.path)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title and data.strip():
            self.has_title = True


def main() -> int:
    errors: list[str] = []

    for path in REQUIRED_FILES:
        if not path.exists():
            errors.append(f"missing required file: {path.relative_to(ROOT)}")

    if not INDEX.exists():
        print("FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    parser = SiteParser()
    parser.feed(INDEX.read_text(encoding="utf-8"))
    parser.close()

    if not parser.has_title:
        errors.append("index.html has no non-empty <title>")
    if not parser.has_description:
        errors.append("index.html has no meta description")
    if not parser.has_h1:
        errors.append("index.html has no <h1>")
    if parser.duplicate_ids:
        errors.append(f"duplicate IDs: {', '.join(sorted(parser.duplicate_ids))}")

    for reference in parser.local_references:
        if reference and not (ROOT / reference).exists():
            errors.append(f"broken local reference: {reference}")

    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    required_css = ["focus-visible", "prefers-reduced-motion", "@media (max-width:"]
    for token in required_css:
        if token not in css:
            errors.append(f"styles.css is missing required rule: {token}")

    if errors:
        print("FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print("PASS")
    print(f"- {len(REQUIRED_FILES)} required files present")
    print(f"- {len(parser.local_references)} local asset references resolve")
    print("- title, description, h1, IDs, focus, reduced motion, and responsive rules checked")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
