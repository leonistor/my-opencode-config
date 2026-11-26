---
name: web-capture
description: Capture a web page as markdown that keeps its content and drops the boilerplate — for researching a product, saving docs before they change, or building a corpus another project will read. Use when asked to fetch, scrape, save, archive or extract a page or site, when comparing projects from their sites, or when a `webfetch` result looks truncated, empty, or full of navigation.
license: MIT
---

# Web capture

Read the recipe first: `~/.config/opencode/cookbook/web-capture.md`. It carries the
measured tables and the failure modes; do not re-derive the tool choice.

## The choice, in five lines

- **Body text** — `html-to-markdown page.html --preprocess --preset standard
  --inline-data-media alt-text-only --skip-images`
- **Tabs, carousels, accordions** — add `--hidden-content reachable`
- **Discovery** — `crawlberg map "$URL" --limit 200 -q`
- **Metadata, images, `json_ld`, raw HTML** — `crawlberg scrape "$URL" -q`
- **Docs site** — probe `$ORIGIN/llms.txt` and `/llms-full.txt` before scraping page
  by page

Never `pandoc` on a JS-rendered site; never `webfetch` for capture — it fails
silently.

## Before writing a note

Measure the capture (`measure.py` in the corpus) and anchor on one string you saw in
the browser. Below 90% coverage on a server-rendered page, something was dropped —
do not write the note anyway.

## Where captures go

`~/work/research`: `subjects/<slug>/note.md` for the dated findings,
`sources/<host>/` for the captures. `capture.sh` there runs the whole loop. Cite
`research: <slug>` in the project; do not copy captures into it.