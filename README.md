# Session Blackbox

Session Blackbox is an experimental module for Foundry Virtual Tabletop.

The module's purpose is to act as a lightweight session black box: observe chat
messages and rolls when they are created in Foundry, keep a compact local copy,
and make future post-session export and analysis possible.

## Status

Experimental / MVP planning.

This repository currently contains only the project documentation. It does not
yet contain a Foundry manifest, scripts, settings, UI, build step, package
manager setup, or export feature.

## Goal

Session Blackbox should preserve the useful shape of a session log before other
modules or chat cleanup tools can remove messages from the visible chat.

Future analysis may combine this Foundry log with a timestamped session
transcript to produce recaps, timelines, important events, rules questions,
narrative analysis, and post-game review.

The AI analysis does not happen inside Foundry. During play, this module should
only observe, copy compact data, and stay out of the way.

## What The Module Should Do

- Capture newly created `ChatMessage` documents through `createChatMessage`.
- Run capture only on the GM client in the initial MVP to avoid duplication.
- Store a compact in-memory representation of messages and rolls.
- Omit private content by default for whispers, blind rolls, and private
  messages.
- Keep the implementation small, transparent, and easy to inspect.
- Prioritize performance and privacy over features.

## What The Module Should Not Do

- Call AI services.
- Call external network services.
- Export automatically.
- Capture private message content without explicit configuration.
- Store complete `ChatMessage` objects.
- Deep-clone large `flags` objects.
- Parse rendered chat HTML or DOM inside hooks.
- Perform heavy work while Foundry is processing chat messages or rolls.

## Future Local Installation

The intended local development setup is:

- Foundry dev data path: `C:/FoundryDataDev`
- Preferred repository path: `C:/Repos/session-blackbox`
- Expected module path: `C:/FoundryDataDev/Data/modules/session-blackbox`

The expected strategy is to create a junction from the Foundry module directory
to the repository:

```powershell
New-Item -ItemType Junction `
  -Path "C:/FoundryDataDev/Data/modules/session-blackbox" `
  -Target "C:/Repos/session-blackbox"
```

This is documented for future use only. The current repository intentionally
does not include `module.json` yet.

## Documentation

- [Project Context](docs/PROJECT_CONTEXT.md)
- [MVP Level 1](docs/MVP_LEVEL_1.md)
