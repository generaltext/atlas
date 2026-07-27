# Atlas — data format

Atlas stores an **append-only event log**, one JSON object per line, sharded by
month. Fold the log in order to reconstruct current state. Nothing is mutated or
deleted in place (archive is a flag).

## Paths (relative to the app data folder, versioned under `v0/`)

- `v0/events/YYYY-MM.jsonl` — the event log (one shard per calendar month).
- `v0/config.json` — settings: the project **statuses** (each `{ key, label, color }`)
  and `defaultStatus` (the status new projects start with). Edited via the Settings tab.

## Event envelope

```json
{ "id": "evt_01J…", "ts": "2026-07-27T12:00:00.000Z", "actor": {"id":"…","name":"…"},
  "type": "<entity>.<verb>", "subject": "<record id>", "data": { … } }
```

`id` is unique and dedupes idempotently. `subject` is the record's id; ids are
prefixed by kind: `prj_` project, `cli_` client, `con_` contact, `dlv_`
deliverable, `mst_` milestone, `log_` update-log entry.

## Entities and verbs

- **project / client / contact** — `create` (data = field values), `update`
  (changed fields), `archive`, `restore`.
  - project fields: `name`, `client` (a `cli_…` id), `start`, `end` (dates),
    `status` (a status `key` defined in config), and **`context`** — freeform
    text that may embed `@[Label](prj_id)` mention tokens.
  - client fields: `name`, `about`. contact fields: `name`, `role`, `email`.
- **deliverable** — a link. `create` / `update` / `archive`. data:
  `{ projectId, label, url, done, due, dueDate, order }` — `done` = delivered,
  `due` = flagged as an outstanding/known deliverable, `dueDate` = optional ISO date.
- **milestone** — a roadmap item. data:
  `{ projectId, when, label, desc, status: "todo"|"next"|"done", order }`.
- **log** — an update-log entry, added manually or pushed by an agent. data:
  `{ projectId, at, title, body, source: "manual"|"agent" }`.
- **link** — a bidirectional project ↔ contact association. `add` / `remove`.
  data: `{ to: <other id> }`, subject = the project (or contact).

## The lineage graph is DERIVED, not stored

There is no lineage/edge record. The graph is computed from the `@[Label](prj_id)`
mentions inside each project's **`context`** field: a mention of project B in
project A's context is a directed edge **A → B** ("A builds on B"). A project's
upstream = who it mentions; its downstream = who mentions it.

## Pushing updates from an agent

An agent (e.g. one reading a repo's recent commits) appends update-log entries by
writing `log.create` events with `source: "agent"` — the same shape a manual entry
uses. Updates are not git-bound; they're just log entries, however they're produced.
