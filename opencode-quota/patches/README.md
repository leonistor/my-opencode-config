# Local patches for the installed plugins

These files patch plugin code that lives **inside the npm cache**
(`~/.cache/opencode/npm/...`), which OpenCode replaces whenever it updates a
plugin. They are not applied automatically — run them by hand after an update.

## `openrouter-credits.mjs`

Makes the OpenRouter row in `@slkiser/opencode-quota` (5.x) show the account's
**remaining credit** instead of the key's all-time spend.

Why: the plugin only calls `GET https://openrouter.ai/api/v1/key`. When the key
has no `limit`, it falls back to the key's lifetime `usage` (e.g. `$65.43`),
which is not a quota left. The account's real remaining credit is
`total_credits - total_usage` from `GET https://openrouter.ai/api/v1/credits`.

After patching, the OpenRouter row shows the credit left and no percentage bar
(a single row — the plugin's single-window projection keeps one row per
provider, and the $80 total is not interesting):

```
[OpenRouter]                       $13.95
```

The grouped surfaces (the `/quota` Limits table) carry the label `Credits left:`.

Usage:

```sh
node openrouter-credits.mjs            # apply (idempotent)
node openrouter-credits.mjs --dry-run  # show the diff, change nothing
node openrouter-credits.mjs --revert   # restore the backup
```

The script finds the newest `<scope>@5` install, refuses to patch when the
upstream file does not match the expected layout, keeps a `openrouter.js.orig`
backup next to the patched file, runs `node --check`, and clears the cached
OpenRouter row so the old value is not reused.

**Restart OpenCode afterwards** — the plugin loads at process start, so
`opencode serve --service` and every TUI must be restarted to pick the patch up.

Not needed on plugin v6+? Check first: v6 changes the OpenRouter row to this
month's spend (`usage_monthly`) but still does not read `/api/v1/credits`, so
this patch is still required for a "credit left" row. The script aborts on
unrecognised layouts instead of guessing.
