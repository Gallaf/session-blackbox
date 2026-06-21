# MVP Level 1

MVP Level 1 is the first implementation milestone for Session Blackbox.

It should create a minimal Foundry VTT module that appears in Foundry, loads a
single JavaScript file, captures new chat messages on the GM client, and stores
compact entries in memory.

Do not expand beyond this scope during Level 1.

## Future Files Expected

These files are expected when MVP Level 1 is implemented:

- `module.json`
- `scripts/session-blackbox.js`

They do not exist yet in the documentation-only starting point.

## Exact Scope

MVP Level 1 should:

- appear in Foundry as `Session Blackbox`;
- use module id `session-blackbox`;
- load the main script through `esmodules`;
- register the `createChatMessage` hook;
- capture only on the GM client to avoid duplicate entries;
- copy a compact representation of each new message;
- keep entries in an in-memory array or buffer;
- enforce a maximum buffer size;
- measure capture time with `performance.now()`;
- log debug information to the console only when `DEBUG` mode is enabled;
- expose a debug API on `globalThis.SessionBlackbox`.

## Debug API

The debug API should expose:

- `SessionBlackbox.size()`
- `SessionBlackbox.getLast()`
- `SessionBlackbox.getBuffer()`
- `SessionBlackbox.clear()`

The API is for manual inspection during development. It is not a user-facing UI.

## Compact Fields Desired

The compact entry should preserve useful analysis metadata without storing the
entire Foundry document.

Candidate fields:

- stable message id;
- creation timestamp if available;
- local capture timestamp;
- speaker alias;
- speaker actor id if directly available;
- speaker token id if directly available;
- speaker scene id if directly available;
- user id;
- message type;
- roll mode;
- whether the message is a whisper;
- whether the message is blind/private;
- whether content was omitted;
- content for non-private messages;
- flavor for non-private messages;
- compact roll metadata when rolls exist;
- small selected flag identifiers only if useful and cheap.

Do not deep-clone `flags`. Do not store the full `ChatMessage` object.

## Privacy Rules

Whispers, blind rolls, and private messages must use safe defaults.

For private entries:

- do not save `content`;
- do not save `flavor`;
- save only minimal metadata;
- set `contentOmitted` to indicate that content was intentionally not stored.

MVP Level 1 must not include a setting that enables private content capture.
That decision belongs to a later design step.

## Explicit Non-Goals

MVP Level 1 must not implement:

- JSONL export;
- IndexedDB;
- `localStorage`;
- UI;
- `game.settings`;
- buttons;
- sidebar integration;
- chat cleanup;
- sockets;
- delete hooks;
- complex automated tests;
- TypeScript;
- build tooling;
- npm setup.

## Acceptance Criteria

MVP Level 1 is accepted when:

- the module appears in Foundry;
- the module can be activated in a world;
- the script loads through `esmodules`;
- `createChatMessage` is registered only for capture on the GM client;
- normal chat messages are captured in the in-memory buffer;
- roll messages are captured in the in-memory buffer;
- the buffer has a maximum size;
- private content is omitted by default;
- debug API calls work from the console;
- the module does nothing beyond the documented MVP scope.

## Manual Test Plan

Run these checks in a development world after implementing MVP Level 1.

### Common Message

Send a normal chat message as GM.

Expected result:

- one compact entry is added to the buffer;
- `contentOmitted` is false;
- content is present;
- no visible UI changes are introduced by the module.

### D&D 5e Attack

Trigger a D&D 5e attack roll from a character or NPC sheet.

Expected result:

- one or more compact entries are captured depending on system behavior;
- roll metadata is present when cheaply available;
- capture does not delay or block the roll.

### D&D 5e Damage

Trigger a D&D 5e damage roll.

Expected result:

- the damage roll message is captured;
- compact roll metadata is present when cheaply available;
- full message objects are not stored.

### Spell Displayed

Display a spell card in chat without a roll.

Expected result:

- the spell card message is captured as a chat message;
- no DOM or rendered HTML parsing is required.

### Spell With Roll

Cast or display a spell that includes a roll.

Expected result:

- the chat card and roll data are captured according to what Foundry creates;
- the module uses the created `ChatMessage` document, not rendered HTML.

### Skill Check

Roll a skill check from a character sheet.

Expected result:

- the skill check is captured;
- capture stays lightweight.

### Whisper

Send a whisper.

Expected result:

- a compact metadata entry is captured;
- `content` is not saved;
- `flavor` is not saved;
- `contentOmitted` is true.

### Blind Roll

Make a blind roll.

Expected result:

- a compact metadata entry is captured;
- private content is omitted;
- `contentOmitted` is true.

### Roll Made By Player

Have a player make a normal roll while a GM client is connected.

Expected result:

- the GM client captures the message once;
- player clients do not duplicate the buffer entry.

### Chat Cleaner Active

Enable Chat Cleaner or a similar chat cleanup module and allow it to delete old
chat messages after they are created.

Expected result:

- Session Blackbox captures the message before cleanup;
- cleanup can remove the visible chat message later;
- the compact buffer entry remains available for debug inspection.
