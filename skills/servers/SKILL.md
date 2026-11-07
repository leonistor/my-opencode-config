---
name: servers
description: Operate Leo's fleet from the servers repository — read the declared surface, observe a target, check drift, and plan a change. Use when asked what is deployed where, whether a server is healthy or drifted, or to plan a deploy to any of the four targets. Never execute on server.vitrina.promo without explicit approval.
---

# servers

The repository at `/Users/leo/work/servers` is the source of truth for four
servers and ~21 public hostnames. Read its `AGENTS.md` before doing anything —
it is the contract, not a suggestion.

## Read-only, always allowed

```
cd /Users/leo/work/servers
python3 surface.py                 # targets, routes, deployments, dispositions
python3 surface.py --validate      # the declaration is internally consistent
python3 observe.py <target>        # refresh the snapshot (writes only under snapshots/)
python3 drift.py                   # undeclared / missing / exposed / stale / unbacked
```

## A plan, also allowed on any target

```
pyinfra inventory.py deploy/<name>.py --dry --diff --limit <target> \
  --ssh-user leo --ssh-key ~/.ssh/id_ed25519
```

## Execution rules

| Target | Risk | Rule |
|---|---|---|
| `server.vitrina.promo` | customer | plan, then approval **in words**, then execute |
| `server.parsedw.ink` | internal | execute from a reviewed deploy file, canary first |
| `dev.vitrina.promo` | internal | execute from a reviewed deploy file, canary first |
| `safta.lan` | scratch | execute freely |

A reaction is not approval. Approval of one plan does not approve the next.

## Never

- Call a registrar API. DNS is manual; output instructions instead.
- Put a secret value in a file, a diff, or output. Reference env files by path.
- Run `restic prune`, `docker system prune`, or `apt autoremove` on the customer box.
- Edit `/etc/caddy/Caddyfile` by hand; it is rendered from `deploy/templates/Caddyfile.j2`.
