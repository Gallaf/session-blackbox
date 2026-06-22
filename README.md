# Session Blackbox

Session Blackbox is an experimental module for Foundry Virtual Tabletop.

Its purpose is to act as a lightweight session black box: observe chat messages
when they are created in Foundry, keep a compact local copy in memory, and make
future post-session export and analysis possible.

## Status

Experimental.

MVP Level 2A has been implemented, manually tested, and validated in Foundry VTT.

The current repository contains:

- Foundry VTT module manifest: `module.json`.
- Main module script: `scripts/session-blackbox.js`.
- Documentation for project context and MVP scopes.

## Goal

Session Blackbox should preserve the useful shape of a session log before other
modules or chat cleanup tools can remove messages from the visible chat.

Future analysis may combine this Foundry log with a timestamped session
transcript to produce recaps, timelines, important events, rules questions,
narrative analysis, and post-game review.

The AI analysis does not happen inside Foundry. During play, this module should
only observe, copy compact data, and stay out of the way.

## What Exists Now

- Captures `ChatMessage` documents through the `createChatMessage` hook on the
  GM client.
- Stores compact message records in an in-memory buffer.
- Uses in-memory `seenIds` to avoid duplicate captures.
- Uses `preDeleteChatMessage` as a lightweight fallback before deletion.
- Preserves records in the buffer even if the original chat message is deleted
  later.
- Exposes a debug API at `globalThis.SessionBlackbox`:
  - `size()`
  - `getLast()`
  - `getBuffer()`
  - `clear()`

## Privacy Policy

- Whispers, blind rolls, and private messages do not store `content` or
  `flavor` by default.
- `contentOmitted` is `true` when `content` and `flavor` are intentionally not
  stored.
- The module does not send data to AI services, external networks, or external
  services.

## Not Implemented Yet

- JSONL export.
- UI.
- `game.settings`.
- IndexedDB.
- `localStorage`.
- Persistence between reloads.
- Chat cleanup.
- AI analysis inside Foundry.

## Documentation

- [Project Context](docs/PROJECT_CONTEXT.md)
- [MVP Level 1](docs/MVP_LEVEL_1.md)
- [MVP Level 2A](docs/MVP_LEVEL_2A.md)
