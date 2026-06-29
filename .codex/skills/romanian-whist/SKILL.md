---
name: romanian-whist
description: Project-specific guidance for working on the Romanian Whist local-network card game. Use when Codex is asked to change, debug, review, test, or explain this repository's Next.js/React/TypeScript/Express/Socket.IO app, especially gameplay rules, room lifecycle, bidding, card play, scoring, mobile UI, shared types, or LAN server behavior.
---

# Romanian Whist

## Quick Start

Read `references/project-guide.md` before making code changes. It contains the app architecture, rule ownership, UI conventions, verification commands, and files to avoid editing casually.

Start by inspecting the affected code paths:

- Gameplay/rules/state: `src/server/game.ts`
- Public contracts: `src/shared/types.ts`
- Realtime server wiring: `server.ts`
- Main client UI and copy: `app/page.tsx`
- Styling: `app/globals.css`

## Workflow

Keep the server authoritative. Client events should send intent only; never accept client-provided game state as truth.

For gameplay changes:

1. Update server state transitions, validation, scoring, or card legality in `src/server/game.ts`.
2. Update `src/shared/types.ts` when the shape returned by `publicStateFor` changes.
3. Update `app/page.tsx` only for display, input, copy, or client-side event handling.
4. Verify that private hands are not leaked in public state.

For UI changes:

1. Keep the primary play surface mobile-first.
2. Keep Romanian and English strings together in the `text` object in `app/page.tsx`.
3. Match existing global CSS patterns in `app/globals.css`.
4. Use `lucide-react` for icon buttons or compact controls.

## Verification

Always run:

```bash
npm run typecheck
```

For behavior changes, also run `npm run dev` and manually exercise a four-player room flow when practical: create room, join four players, start game, bid, play legal and illegal cards, finish a round, and continue.
