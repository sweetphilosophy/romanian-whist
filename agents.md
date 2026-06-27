# Agents

## Project

Romanian Whist is a local-network, four-player card game built with Next.js, React, TypeScript, Express, and Socket.IO. The app is intended to run on one computer while phones or other devices on the same Wi-Fi join through the host machine's LAN IP.

## Stack

- Runtime: Node.js with TypeScript executed through `tsx`.
- Frontend: Next.js App Router, React 19, client components in `app/`.
- Styling: Global CSS in `app/globals.css`.
- Realtime transport: Socket.IO server and client.
- HTTP server: Custom Express server in `server.ts`, wrapping Next.js and serving static card assets.
- Game state: In-memory server state in `src/server/game.ts`.
- Shared contracts: TypeScript types in `src/shared/types.ts`.
- Assets: SVG playing cards in `cards/`, served at `/cards`.

## Commands

- Install dependencies: `npm install`
- Run local development server: `npm run dev`
- Build Next.js app: `npm run build`
- Run production server: `npm run start`
- Typecheck: `npm run typecheck`
- Windows convenience launcher: `start-whist.bat`

## Architecture Rules

- Keep the server authoritative. Game rules, turn validation, bidding limits, scoring, and card legality belong in `src/server/game.ts`.
- Do not trust client-provided game state. Client events should identify intent only, such as `placeBid` or `playCard`.
- Keep `src/shared/types.ts` aligned with the shape returned by `publicStateFor`.
- Never expose another player's hand in public state. Only send each socket its own `hand` plus opponents' `handCount`.
- Use Socket.IO acknowledgements consistently: events should return `{ ok: true, roomCode }` or `{ ok: false, error }`.
- Preserve the current room lifecycle unless intentionally changing product behavior: create, join, lobby, start, bid, play, round end, next round, game end.
- Treat `cards/*.svg` file names as part of the card ID contract. Card IDs use rank plus suit, such as `10H`, `AS`, or `2C`.

## Frontend Rules

- Keep the primary gameplay screen usable on phones first. Most players are expected to use mobile devices on the same Wi-Fi.
- Keep UI text in both Romanian and English in the `text` object in `app/page.tsx`.
- Match the current copy style: Romanian strings currently avoid diacritics.
- Use existing global CSS patterns before adding new layout systems or component abstractions.
- Use `lucide-react` icons when adding icon buttons or compact controls.
- Avoid large framework additions unless they clearly reduce complexity.

## Verification

Before handing off code changes, run:

```bash
npm run typecheck
```

For behavior changes, also run the app with:

```bash
npm run dev
```

Then manually verify a room flow with four browser sessions or devices when possible: create room, join four players, start game, bid, play legal and illegal cards, finish a round, and continue to the next round.

## Files To Avoid Editing Casually

- `node_modules/`, `.next/`, and `tsconfig.tsbuildinfo` are generated or installed artifacts.
- `package-lock.json` should only change when dependencies change.
- Card SVGs in `cards/` should only change when asset work is intended.
