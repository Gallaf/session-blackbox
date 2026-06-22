# Session Blackbox

Session Blackbox is an experimental module for Foundry Virtual Tabletop.

The module's purpose is to act as a lightweight session black box: observe chat
messages and rolls when they are created in Foundry, keep a compact local copy,
and make future post-session export and analysis possible.

## Status

Experimental.

MVP Level 1 has been implemented, manually tested, and validated in Foundry VTT.

The current repository contains:

- Foundry VTT module manifest: `module.json`.
- Main module script: `scripts/session-blackbox.js`.
- Documentation for project context and MVP scope.

## Goal

Session Blackbox should preserve the useful shape of a session log before other
modules or chat cleanup tools can remove messages from the visible chat.

Future analysis may combine this Foundry log with a timestamped session
transcript to produce recaps, timelines, important events, rules questions,
narrative analysis, and post-game review.

The AI analysis does not happen inside Foundry. During play, this module should
only observe, copy compact data, and stay out of the way.

## What Exists Now

- Captures newly created `ChatMessage` documents through the
  `createChatMessage` hook.
- Runs capture only on the GM client to avoid duplicate records.
- Stores compact message and roll records in an in-memory buffer.
- Keeps the implementation small, transparent, and easy to inspect.
- Exposes a debug API at `globalThis.SessionBlackbox`:
  - `size()`
  - `getLast()`
  - `getBuffer()`
  - `clear()`

## Privacy Policy

- Whispers, blind rolls, and private messages do not store `content` or
  `flavor` by default.
- The module does not send data to AI services.
- The module does not send data to external networks or external services.

## Not Implemented Yet

- JSONL export.
- UI.
- `game.settings`.
- IndexedDB.
- Persistence between reloads.
- Chat cleanup.
- AI analysis inside Foundry.

## Documentation

- [Project Context](docs/PROJECT_CONTEXT.md)
- [MVP Level 1](docs/MVP_LEVEL_1.md)
