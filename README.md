# Atlas

A General Text app: a master view of your projects, clients, deliverables, roadmap,
and how the work connects (a lineage graph derived from freeform context @mentions).

Runs inside General Text. https://www.generaltext.org

Build it against the app guide: https://www.generaltext.org/llms.txt
(local source: projects/generaltext/content/docs/building-apps.md).

Storage scope: `_gtApps/atlas/data/` (your writable folder; version it as
`data/v0/`, `data/v1/`, and so on).

## Develop

```
pnpm install
pnpm dev        # local dev with an injected runtime + seeded demo workspace
pnpm build      # tsc --noEmit && vite build
pnpm typecheck
pnpm test
```
