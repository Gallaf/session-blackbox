# MVP Level 2B

MVP Level 2B is the manual export planning milestone for Session Blackbox.

MVP Level 1 validated compact in-memory capture through `createChatMessage`.
MVP Level 2A validated lightweight deduplication and the
`preDeleteChatMessage` fallback while preserving the existing privacy policy.

Level 2B should keep that behavior intact and plan a manual JSONL export of the
current in-memory buffer.

Do not implement export, UI, settings, persistence, hooks, or API changes during
this documentation task.

## Objective

MVP Level 2B should define the future manual JSONL export behavior for the
current compact buffer.

The goal is to let the GM intentionally export the retained in-memory capture
records as a local text artifact when they choose to do so.

This is a planning step only. No export function should be implemented in this
task.

## JSONL In This Context

JSONL means JSON Lines.

For Session Blackbox, JSONL should be a plain text string where each retained
compact buffer entry is serialized as one JSON object on one line.

Example shape:

```jsonl
{"id":"message-id-1","type":"chat","content":"Hello","flavor":null,"contentOmitted":false}
{"id":"message-id-2","type":"whisper","content":null,"flavor":null,"contentOmitted":true}
```

The exact fields should remain the compact record shape already captured by the
module. Level 2B should not expand the records into full `ChatMessage`
documents.

## Why Manual Export

Export should be manual and outside capture hooks because serialization is not
part of chat capture.

The capture hooks should stay cheap, predictable, and focused on recording only
compact in-memory entries.

Manual export keeps expensive work away from `createChatMessage` and
`preDeleteChatMessage`. It also keeps the GM in control of when a local artifact
is created.

Level 2B should not create automatic export behavior.

## Exact Scope

MVP Level 2B may plan future behavior that will:

- export the current buffer manually;
- keep the compact format already captured;
- preserve the existing privacy policy;
- keep whispers, blind rolls, and private messages without `content` and without
  `flavor`;
- avoid sending anything to AI, the network, or any external service;
- avoid persistence for now;
- avoid UI for now.

The future export should operate only on the current retained in-memory buffer.
It should not attempt to reconstruct older messages that have already been
trimmed.

## Explicit Non-Goals

MVP Level 2B documentation must keep the following out of scope:

- automatic export;
- external upload;
- AI inside Foundry;
- IndexedDB;
- `localStorage`;
- `game.settings`;
- capture hook changes;
- chat cleanup;
- README changes;
- `module.json` changes;
- `scripts/session-blackbox.js` changes.

This task must not modify any file other than `docs/MVP_LEVEL_2B.md`.

## Future Technical Strategy

A later implementation may add a manual API under `globalThis.SessionBlackbox`.

Candidate future functions:

- `toJsonl()`: return the current buffer as a JSONL string;
- `downloadJsonl()`: optionally trigger a local browser download of that JSONL
  string.

These functions are candidates only. They must not be implemented in this
documentation task.

The API should remain manual. Calling it from the browser console or a later UI
control would be acceptable in a future implementation, but neither UI nor code
changes are part of this task.

## Performance Rules

MVP Level 2B should keep capture performance unchanged.

Future implementation rules:

- do no heavy work inside `createChatMessage`;
- do no heavy work inside `preDeleteChatMessage`;
- do JSONL serialization only when the GM manually triggers export;
- avoid async work, I/O, network calls, or file preparation during capture;
- keep hook behavior focused on compact in-memory capture and deduplication.

The export operation may serialize the current retained buffer, but only at the
manual export boundary.

## Privacy Rules

MVP Level 2B must preserve the privacy behavior already established by Levels 1
and 2A.

Future implementation rules:

- respect `contentOmitted`;
- do not reconstruct private content;
- do not try to recover content from the DOM;
- do not parse rendered chat HTML;
- do not fetch or inspect Actor, Item, Token, or Scene documents to enrich
  private records;
- do not expand complete `flags` objects;
- do not add `content` or `flavor` for whispers, blind rolls, or private
  messages;
- export only the compact fields already retained in the buffer.

If a compact entry omitted content during capture, JSONL export must preserve
that omission exactly.

## Acceptance Criteria

This documentation task is accepted when:

- `docs/MVP_LEVEL_2B.md` exists;
- the document describes the objective of MVP Level 2B;
- the document explains JSONL in the context of the current compact buffer;
- the document explains why export should be manual and outside hooks;
- the document lists the allowed Level 2B scope;
- the document lists explicit non-goals;
- the document proposes future manual API candidates without implementing them;
- the document states performance rules for keeping hooks lightweight;
- the document states privacy rules for omitted content;
- the document includes a future manual test plan;
- no code is changed;
- no existing API is changed;
- no hooks are changed;
- `README.md`, `module.json`, and `scripts/session-blackbox.js` remain
  unchanged.

## Future Manual Test Plan

Run these checks in a development world after MVP Level 2B code is implemented.

### Export Normal Messages

Create a few normal chat messages as GM, then manually trigger JSONL export.

Expected result:

- the export returns or downloads a plain text JSONL artifact;
- each retained compact entry appears as one JSON object per line;
- normal public content is present only when it was already retained by capture;
- no visible UI is required for this MVP;
- no network request is made.

### Export Roll Messages

Create normal roll messages, then manually trigger JSONL export.

Expected result:

- roll entries are represented using the compact captured format;
- roll data is not expanded into full Foundry documents;
- the export does not block or delay future rolls;
- the browser console shows no errors.

### Export Whispers

Create a whisper and manually trigger JSONL export.

Expected result:

- the whisper entry is present only if it is in the current retained buffer;
- `contentOmitted` is true;
- `content` is `null`;
- `flavor` is `null`;
- the export does not reconstruct private content.

### Export Blind Rolls

Create a blind roll and manually trigger JSONL export.

Expected result:

- the blind roll entry is present only if retained in the current buffer;
- `contentOmitted` is true;
- `content` is `null`;
- `flavor` is `null`;
- no private roll content is recovered from rendered chat HTML or other Foundry
  documents.

### Export After Buffer Trim

Create more messages than the configured buffer maximum, then manually trigger
JSONL export.

Expected result:

- only currently retained compact entries are exported;
- trimmed records are not reconstructed;
- the number of JSONL lines matches the current buffer size;
- `SessionBlackbox.size()` and the exported line count agree.

### Export After Clear

Call `SessionBlackbox.clear()`, then manually trigger JSONL export.

Expected result:

- the exported JSONL string is empty or produces an empty local artifact;
- no old records reappear;
- no persistence layer is read;
- no external service is contacted.

### Verify Hook Performance

Create and delete chat messages before and after manual export.

Expected result:

- `createChatMessage` remains lightweight;
- `preDeleteChatMessage` remains lightweight;
- serialization occurs only when manual export is triggered;
- capture and deletion behavior remain unchanged from MVP Level 2A.

## Implementation Notes For Later

The future implementation should prefer a small helper that serializes the
current compact buffer with `JSON.stringify(entry)` per line.

The implementation should not mutate entries while exporting.

If browser download support is added later, it should create a local download
from the generated JSONL string without contacting any remote service.

These are planning notes only. MVP Level 2B documentation does not implement
code.
