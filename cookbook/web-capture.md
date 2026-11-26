# Recipe: web capture — page to markdown you can keep

**Use when** a page's text is evidence: researching a product or tool, saving docs
before they change, quoting a pricing page, building a corpus another project will
read. **Do not use** for a quick look inside a session — `webfetch` is fine there —
or when the page's JavaScript behaviour *is* the thing; that is `playwriter`.

The rule the measurements below support: **one fetcher per job**, and never judge a
capture by how it looks — measure what it kept.

## Which fetcher, measured

Six converters on three pages of one Next.js marketing site, **2026-11-26**
(`bytes · coverage · noise`; coverage = share of the page's visible words recovered,
noise = output words the page does not have):

| Tool | home | pricing | docs page |
| --- | --- | --- | --- |
| **html-to-markdown**, standard | 7,399 B · 89.4% · +73 | 2,286 B · 97.8% · +40 | 20,211 B · 97.6% · +44 |
| html-to-markdown, aggressive | 6,596 B · 88.5% · +37 | 1,509 B · 97.2% · +2 | 19,524 B · 94.9% · +28 |
| html-to-markdown, raw | 35,058 B · 91.0% · +316 | 25,848 B · 98.9% · +287 | 46,616 B · 98.2% · +52 |
| crawlberg `scrape --format markdown` | 8,844 B · 89.7% · +202 | 3,451 B · 97.8% · +171 | 21,765 B · 97.9% · +210 |
| pandoc | 10,816 B · **6.3%** · +986 | 277 B · 11.8% · +13 | 188,631 B · 74.2% · +10,933 |
| opencode `webfetch` | prose only, images dropped, JS counters blank | **cookie footer only** | not fetched |

A second pass on four unfamiliar sites (same day, flags below) held up:

| Site | markdown | coverage | noise |
| --- | --- | --- | --- |
| lite.ego.app | 20,383 B | 98.2% | +116 |
| pyspur.dev | 3,660 B | 100.0% | +59 |
| docs.sedum.dev | 2,096 B | 99.5% | +31 |
| ollaya.dev | 14,461 B | 86.7% | +221 |

The division of labour:

- **Body text** → `html-to-markdown --preprocess --preset standard`.
- **Finding the pages** → `crawlberg map` (90 URLs in 0.19 s on the first site).
- **Metadata, images, `json_ld`, raw HTML** → `crawlberg scrape --format json`.
- **Never** `pandoc` on a JS-rendered site, and **never** `webfetch` for capture: it
  returned a cookie footer for a page whose content was server-rendered, silently.
  One silent empty result disqualifies a tool for bulk work.

## The loop

```bash
# 1. what pages exist (fast; empty on client-routed marketing sites)
crawlberg map "$URL" --limit 200 -q > map.json

# 2. the text
curl -sSL -A "$UA" "$URL" -o page.html
html-to-markdown page.html --preprocess --preset standard \
  --inline-data-media alt-text-only --skip-images -o page.md

# 3. the evidence around the text
crawlberg scrape "$URL" -q > scrape.json

# 4. did it work? (same metric as the tables above)
python3 measure.py page.html page.md
```

`UA` is a current desktop Chrome string; the default `curl` agent gets served
different pages by several sites. All four trial sites reported
`js_render_hint: false` — a static fetch was enough — so check that field from
`scrape.json` before reaching for a renderer.

## Flags that moved the numbers

| Flag | What it does | Effect |
| --- | --- | --- |
| `--skip-images` | omits `<img>` entirely | pyspur 6,390 → 3,660 B, noise +426 → +59; lite.ego 24,089 → 20,383 B, +518 → +116; coverage unchanged |
| `--hidden-content reachable` | keeps text hidden by `hidden`/inline style | ollaya 72.8% → 86.7%; recovers tab, carousel and accordion panels. Default is `drop` |
| `--preset aggressive` | strips more | cost 2.7 coverage points on the longest page to save 16 words of noise — not worth it |
| `--inline-data-media alt-text-only` | governs `data:` URLs only | kills base64 payloads; it does **not** drop ordinary image links, which is what `--skip-images` is for |
| `--preprocess` | repairs and normalises the DOM | required on hand-written or misnested marketing HTML; `standard` over `aggressive` |

`--skip-images` also removes alt text, and leaves an empty `<li>` where an image was
a list item's only content. When an image *is* the evidence, take it from
`scrape.json` (`images[]` carries `src` and `alt`), not from the markdown.

## Docs sites: probe `llms.txt` first

Three of the four trial sites publish one. `docs.sedum.dev/llms-full.txt` is 175 KB
holding the entire documentation set; its landing page is 13 links in 2 KB. One
request instead of sixteen, and no per-page flag tuning:

```bash
curl -fsSL "$ORIGIN/llms.txt"      # the index
curl -fsSL "$ORIGIN/llms-full.txt" # when offered, the whole corpus
```

An SPA can answer 404 with an HTML page, so check the first bytes for `<!doctype`.

## Verification

- **Coverage and noise** (script below), not eyeballing. Below ~90% coverage on a
  server-rendered page, something was dropped; above ~100 noise words, boilerplate
  or image URLs came along.
- **Anchor on a known string**: a price, a version, a sentence seen in the browser.
  If it is absent, stop — do not write the note from the page title.
- **Size sanity**: a 500 KB HTML page yielding 2 KB of markdown is a link index or a
  client-rendered shell, not content.
- **One silent empty result disqualifies a tool for the rest of the run.**

`measure.py` (stdlib only, in the research corpus) is the reference: strip
`script/style/header/footer/nav/noscript/svg/template`, drop elements carrying
`hidden`, strip tags, count words.

## Failure modes, all met

- `webfetch` returning the cookie footer as success (`very_short_content`).
- `pandoc` reading a Next.js page literally: 6.3% coverage, 188 KB of script noise.
- `crawlberg --browser-mode always` byte-identical to static and 8× slower; it did
  not wait for JS-animated counters either.
- `crawlberg map` returning **one** URL for a client-routed marketing site.
- A metric that counts text inside `hidden` elements: ollaya scored 68% for panels no
  browser shows. Fix the reference, not the converter.
- Label and value in adjacent spans coming out glued (`Refund0.91`) — the numbers
  survive, the separation does not.
- Empty list items where `--skip-images` removed an image that was the only content.

## Known losses (any converter)

- Syntax-highlighted "code" panels (demos rendered as styled spans) are not fenced
  code. Extract `<pre>` separately when code matters.
- JS-animated counters, tab panels without `--hidden-content reachable`, and
  carousels yield one slide or nothing.
- Inline SVG illustrations are not representable; take a screenshot.
- Client-rendered sites need a renderer, and none of these numbers apply to them.

## Where the captures go

`~/work/research` — one subject per product, `subjects/<slug>/note.md` for the dated
findings and `sources/<host>/` for the captures, with `source.json` recording URL,
fetch time, tool versions, hash, coverage and noise. Its `scripts/capture.sh` runs
this loop; its `AGENTS.md` carries the schema. A project cites `research: <slug>`
instead of copying findings.

## When to revisit

- `html-to-markdown` or `crawlberg` ships a major version.
- A capture target is client-rendered, or its code blocks matter — then benchmark a
  renderer and a `<pre>`-aware extraction against these tables.
- The chosen flags change: `--preset`, `--inline-data-media`, `--preprocess`,
  `--skip-images` and `--hidden-content` are the five that moved the numbers.