# MVP Level 2A

MVP Level 2A is the next robustness milestone for Session Blackbox.

MVP Level 1 already validated the central capture path: the GM client captures
new `ChatMessage` documents through `createChatMessage`, stores compact entries
in an in-memory buffer, and omits private content by default.

Level 2A should keep that behavior intact and add a small deletion fallback so
the module is more resilient when another module deletes a message before the
primary capture path has recorded it.

Do not implement export, UI, settings, or persistence during Level 2A.

## Exact Scope

MVP Level 2A should:

- keep `createChatMessage` as the primary capture path;
- continue capturing only on the GM client;
- add an in-memory `seenIds` set for message ids or uuids already captured;
- register `preDeleteChatMessage` only on the GM client;
- use `preDeleteChatMessage` as a lightweight fallback before deletion;
- avoid duplicate compact entries when the same message is seen by both hooks;
- keep the existing privacy rules exactly as defined in MVP Level 1;
- keep both the buffer and `seenIds` bounded;
- avoid heavy work in hooks.

## `seenIds`

Level 2A should maintain a `Set` in memory containing message identifiers that
have already been captured.

The identifier should be stable and cheap to read from the `ChatMessage`
document. Prefer the same id field already used by the compact entry in Level 1.
If both `uuid` and `id` are available, choose one consistent identifier strategy
and use it in both hooks.

Expected behavior:

- when `createChatMessage` captures a message, add its identifier to `seenIds`;
- when `preDeleteChatMessage` sees a message, check `seenIds` first;
- if the identifier already exists, do not append a second compact entry;
- if the identifier is missing, create a compact fallback entry and then add the
  identifier to `seenIds`;
- if no usable identifier exists, use the safest minimal behavior and avoid
  making deduplication fragile.

`seenIds` must not grow forever.

The simplest acceptable strategy is to keep `seenIds` aligned with the existing
bounded buffer:

- define one shared maximum capture size;
- when the buffer drops old entries because it exceeded the maximum size, remove
  the corresponding old identifiers from `seenIds`;
- keep the buffer and `seenIds` trimming logic together so they cannot drift
  indefinitely.

It is acceptable for `seenIds` to briefly contain only identifiers for entries
still retained in the in-memory buffer. Level 2A does not need historical
deduplication beyond the current bounded memory window.

## `preDeleteChatMessage` Fallback

`preDeleteChatMessage` should be registered only on the GM client.

Its purpose is to act as a safety net before another module or script deletes a
`ChatMessage`.

When the hook receives a message:

- return immediately if the current client is not the GM capture client;
- read only cheap fields directly available on the message;
- check whether the message identifier already exists in `seenIds`;
- if the message was already captured, do not create a duplicate entry;
- if the message was not captured, create the same compact record shape used by
  `createChatMessage`;
- mark fallback records with `source: "preDeleteChatMessage"`;
- allow deletion to continue normally.

The hook must not:

- block deletion;
- use `await`;
- perform I/O;
- call the network;
- call AI;
- parse rendered chat HTML or the DOM;
- scan `game.messages`;
- resolve Actor, Item, Token, or Scene documents through expensive lookups;
- deep-clone full `flags` objects;
- store the full `ChatMessage` object.

The fallback should be intentionally small. It exists to preserve compact
metadata at the last cheap moment before deletion, not to reconstruct complex
state.

## Deduplication

Deduplication should be based on `seenIds`.

If `createChatMessage` already captured a message, `preDeleteChatMessage` must
not append a second buffer entry for the same message.

The original compact record should remain unchanged.

Optionally, Level 2A may record a very small metadata signal that an already
captured message was later seen in `preDeleteChatMessage`, but only if this does
not complicate the MVP. This is optional and should not be required for
acceptance.

Examples of acceptable optional metadata:

- a simple debug counter for skipped duplicate pre-delete messages;
- a lightweight field on the existing entry, if it can be updated cheaply.

Do not add a second record solely to represent the deletion event.

## Privacy Rules

Level 2A must keep exactly the same privacy policy as MVP Level 1.

For whispers, blind rolls, and private messages:

- do not save `content`;
- do not save `flavor`;
- set `contentOmitted` to `true`;
- save only minimal metadata;
- do not capture private content by default.

This rule applies equally to records captured through `createChatMessage` and
records captured through the `preDeleteChatMessage` fallback.

Level 2A must not add a setting that enables private content capture.

## Explicit Non-Goals

MVP Level 2A must not implement:

- JSONL export;
- UI;
- `game.settings`;
- IndexedDB;
- `localStorage`;
- persistence between reloads;
- chat cleanup;
- AI analysis;
- sockets;
- build step;
- TypeScript;
- complex automated tests.

Level 2A should not change the module into a broader product surface. It is only
a robustness step for in-memory capture.

## Acceptance Criteria

MVP Level 2A is accepted when:

- `createChatMessage` continues working as validated in MVP Level 1;
- normal chat messages are still captured once in the in-memory buffer;
- roll messages are still captured once in the in-memory buffer;
- `preDeleteChatMessage` captures a compact entry when a message was not
  captured before deletion;
- fallback entries use `source: "preDeleteChatMessage"`;
- `preDeleteChatMessage` does not duplicate messages already captured by
  `createChatMessage`;
- deleting messages manually with `ChatMessage.deleteDocuments(ids)` does not
  create duplicate compact entries;
- private content is still omitted for whispers, blind rolls, and private
  messages;
- fallback capture follows the same privacy rules as primary capture;
- the buffer remains bounded;
- `seenIds` remains bounded;
- hook work remains lightweight and does not delay chat creation, rolls, or
  deletion;
- no export, UI, settings, sockets, persistence, AI, or network behavior is
  introduced.

## Manual Test Plan

Run these checks in a development world after implementing MVP Level 2A.

### Common Message Created Normally

Send a normal chat message as GM.

Expected result:

- one compact entry is added to the buffer;
- the entry source is the normal `createChatMessage` source used by the
  implementation;
- `contentOmitted` is false;
- content is present;
- `SessionBlackbox.size()` increases by one;
- no visible UI changes are introduced by the module.

### Roll Created Normally

Create a normal roll from chat or a character sheet.

Expected result:

- one compact entry is added for the roll message;
- compact roll metadata is present when cheaply available;
- capture does not delay or block the roll;
- `SessionBlackbox.getBuffer()` shows only compact data, not full
  `ChatMessage` objects.

### Delete Message Already Captured

Create a normal message and confirm it appears in `SessionBlackbox.getBuffer()`.
Then delete the message using Foundry or the console.

Example console command:

```js
await ChatMessage.deleteDocuments([messageId]);
```

Expected result:

- `preDeleteChatMessage` may see the message;
- no second compact entry is added;
- `SessionBlackbox.size()` does not increase because of the deletion;
- the original compact record remains in the buffer.

### Delete Documents Without Duplicates

Create multiple messages and confirm they were captured.
Delete them with `ChatMessage.deleteDocuments(ids)`.

Expected result:

- deletion succeeds normally;
- no duplicate compact entries are created;
- the buffer still contains the original compact records until normal buffer
  trimming removes them.

### Simulated Fallback

If needed, simulate a fallback in a controlled way by clearing the in-memory
buffer and `seenIds` through the development debug API or temporary console-only
test helper, then deleting a still-existing chat message.

Expected result:

- `preDeleteChatMessage` captures the message before deletion;
- the fallback record uses `source: "preDeleteChatMessage"`;
- the record has the same compact shape as normal capture;
- the message identifier is added to `seenIds`;
- deletion is not blocked.

Do not keep temporary test helpers in production code unless they are part of
the documented debug API.

### Whisper Deleted

Create a whisper and then delete it.

Expected result:

- if captured by `createChatMessage`, deletion does not duplicate it;
- if captured by fallback, the fallback record omits private content;
- `content` is not saved;
- `flavor` is not saved;
- `contentOmitted` is true.

### Blind Roll Deleted

Create a blind roll and then delete it.

Expected result:

- if captured by `createChatMessage`, deletion does not duplicate it;
- if captured by fallback, the fallback record omits private content;
- `content` is not saved;
- `flavor` is not saved;
- `contentOmitted` is true.

### Debug API Inspection

Use the development console to inspect the in-memory state.

Expected result:

- `SessionBlackbox.size()` reports the number of retained compact records;
- `SessionBlackbox.getBuffer()` returns the retained compact records;
- retained records are compact;
- private records show `contentOmitted: true`;
- fallback records, when present, show `source: "preDeleteChatMessage"`;
- there are no errors in the browser console.

### Bounded Memory

Create more messages than the configured buffer maximum.

Expected result:

- the buffer remains at or below the configured maximum size;
- old compact entries are trimmed according to the existing buffer policy;
- corresponding old identifiers are removed from `seenIds`;
- `seenIds` remains at or below the configured maximum capture size.

## Implementation Notes For Later

The implementation should prefer small helper functions shared by both hooks so
privacy and compact field behavior cannot drift.

Likely shared helpers:

- get a stable message identifier;
- decide whether content should be omitted;
- create a compact entry from a `ChatMessage`;
- append a compact entry and trim the buffer plus `seenIds` together.

These are planning notes only. MVP Level 2A documentation does not implement
code.
