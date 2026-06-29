# Romanian Whist Project Guide

## Product Intent

Build a fast, reliable local Romanian Whist table for exactly four players. The app runs on one computer, and phones or other devices on the same Wi-Fi join through the host machine's LAN IP.

## Stack

- Runtime: Node.js with TypeScript executed through `tsx`.
- Frontend: Next.js App Router, React 19, client components in `app/`.
- Styling: global CSS in `app/globals.css`.
- Realtime transport: Socket.IO server and client.
- HTTP server: custom Express server in `server.ts`, wrapping Next.js and serving static card assets.
- Game state: in-memory server state in `src/server/game.ts`.
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

- Keep game rules, turn validation, bidding limits, scoring, and card legality in `src/server/game.ts`.
- Do not trust client-provided game state. Client events should identify intent only, such as `placeBid` or `playCard`.
- Keep `src/shared/types.ts` aligned with the shape returned by `publicStateFor`.
- Never expose another player's hand in public state. Only send each socket its own `hand` plus opponents' `handCount`.
- Use Socket.IO acknowledgements consistently: events should return `{ ok: true, roomCode }` or `{ ok: false, error }`.
- Preserve the lifecycle unless deliberately changing product behavior: create, join, lobby, start, bid, play, round end, next round, game end.
- Treat `cards/*.svg` file names as part of the card ID contract. Card IDs use rank plus suit, such as `10H`, `AS`, or `2C`.

## Game Logic

- Prefer small pure helpers for rule calculations: turn order, legal cards, trick winner, scoring, and bid availability.
- Keep state transitions explicit and easy to audit: `lobby`, `bidding`, `playing`, `roundEnd`, `gameEnd`.
- Preserve the last-bidder rule: the last bidder cannot make total bids equal tricks, unless deliberately changing the Romanian Whist variant.
- Preserve the current round size sequence unless deliberately changing game length.
- Avoid hidden client assumptions about turn order, scoring, or legal cards.

## Realtime And State

- Send each client only the state it is allowed to see.
- Emit fresh room state after every successful mutating event.
- Keep reconnect behavior based on stable `clientId` values stored in local storage.
- Be cautious with room-level changes while disconnected players exist. Current behavior marks players disconnected and allows reconnection, but does not replace them mid-game.
- Add room cleanup deliberately if expiration is needed; do not silently remove active rooms.

## Frontend Rules

- Keep the gameplay screen usable on phones first.
- Keep UI text in both Romanian and English in the `text` object in `app/page.tsx`.
- Match the current copy style: Romanian strings currently avoid diacritics.
- Use existing global CSS patterns before adding new layout systems or component abstractions.
- Use `lucide-react` icons when adding icon buttons or compact controls.
- Avoid large framework additions unless they clearly reduce complexity.
- Use accessible labels on icon-only buttons and card buttons.
- Keep the score modal usable with long game histories and small screens.

## Styling

- Use `app/globals.css` for the current styling approach.
- Prefer existing CSS variables and component classes.
- Keep cards, controls, and seats at the existing 8px radius style.
- Avoid decorative complexity that competes with gameplay clarity.
- Check both Romanian and English labels when adding UI, because text length can affect layout.
- Preserve stable dimensions for cards, seats, buttons, and HUD areas so gameplay does not shift while turns update.

## TypeScript

- Keep strict TypeScript compatibility.
- Prefer explicit domain types over broad `string` or `number` values for cards, phases, suits, ranks, and public state.
- Avoid `any`. If a Socket.IO payload is unknown, validate and coerce it at the boundary.
- Keep shared client/server types in `src/shared/types.ts`.
- Keep server-only internal types in `src/server/game.ts` unless the client needs them.

## Assets

- Refer to cards through `/cards/${card.id}.svg`.
- Keep card IDs consistent with existing file names.
- Do not rename card assets without updating all references and verifying the full deck.

## Testing And Manual QA

- Run `npm run typecheck` after code changes.
- Use `npm run dev` for local manual testing.
- For gameplay changes, test with four independent browser contexts or devices when practical.
- Verify error paths, not only successful paths: invalid room code, non-host start, invalid bid, out-of-turn bid, illegal card, reconnect after refresh.
- When changing layout, verify desktop width, mobile portrait, and short mobile landscape.

## Dependency Changes

- Add dependencies only when they solve a real project need.
- Keep `package-lock.json` committed with dependency changes.
- Prefer platform-neutral scripts in `package.json`; keep `start-whist.bat` as a Windows convenience wrapper.

## Documentation

- Update root `progress.md` when a feature is added, removed, or meaningfully changed.
- Add known issues as soon as they are discovered.
- Keep docs factual and current. Root `agents.md` and `guidelines.md` have been folded into this skill guide.

## Files To Avoid Editing Casually

- `node_modules/`, `.next/`, and `tsconfig.tsbuildinfo` are generated or installed artifacts.
- `package-lock.json` should only change when dependencies change.
- Card SVGs in `cards/` should only change when asset work is intended.
