# Atlas — data format

Atlas stores an **append-only event log**, one JSON object per line, sharded by
month. Fold the log in order to reconstruct current state. Every change is an
event; nothing is mutated or deleted in place (archive is a flag).

## Paths (all relative to your app data folder, versioned under `v0/`)

- `v0/events/YYYY-MM.jsonl` — the event log (one shard per calendar month).
- `v0/config.json` — small mutable settings (status → color tone map).

## Event envelope

```json
{ "id": "evt_01J…", "ts": "2026-07-20T12:00:00.000Z", "actor": {"id":"…","name":"…"},
  "type": "<entity>.<verb>", "subject": "<record id>", "data": { … } }
```

- `id` is unique and used for idempotent dedupe — applying the same event twice
  is a no-op, so re-reading the log always yields the same state.
- `subject` is the id of the record the event is about. Ids are prefixed by kind:
  `prj_` project, `cli_` client, `con_` contact, `ctr_` contract, `dlv_`
  deliverable, `mst_` milestone, `res_` resource, `lin_` lineage edge, `log_`
  update-log entry.

## Entities and verbs

- **project / client / contact / contract** — `create` (data = field values),
  `update` (changed fields), `archive`, `restore`. Fields are flat string/number
  values; `client` fields hold a `cli_…` id (a reference).
- **deliverable** — `create` / `update` / `archive` / `restore`. data:
  `{ projectId, label, status: "todo"|"now"|"done", due, clientVisible, order }`.
- **milestone** — same verbs. data:
  `{ projectId, when, label, desc, status: "todo"|"next"|"done", clientVisible, order }`.
- **resource** — same verbs. data:
  `{ projectId, label, url, type, note, clientVisible }` where type ∈
  repo, deploy, design, doc, dataset, contract, report, link.
- **log** — an update-log entry, usually written by the ingest agent. data:
  `{ projectId, at, title, body, source: "agent"|"human", commits, repo, hash, clientVisible }`.
- **lineage** — directed edges between projects. `add` /  `update` / `remove`.
  data: `{ from, to, kind, note, clientVisible }` where kind ∈
  seeded, extracted, reused, informed, forked.

## clientVisible

Deliverables, milestones, resources, log entries, and lineage edges each carry a
`clientVisible` flag. It defaults to `false`; a human promotes an item to appear
on the shared client report. Nothing marked private ever leaves the internal view.
